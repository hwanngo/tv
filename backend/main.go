// IPTV Play Bridge — turns a UDP-multicast IPTV playlist into browser-playable
// HLS, serves a channel list + EPG as JSON with CORS, and proxies direct (e.g.
// iptv-org) HLS past CORS. Single binary; your React + Vite app calls these
// endpoints.
//
//	go run .  -m3u <your-udp-playlist.m3u>  -epg <your-epg.xml> \
//	          -addr :8080 -iface eth0
//
// -m3u/-epg are optional: with neither, it runs proxy-only for iptv-org country
// lists (fetched + parsed client-side). Requires ffmpeg on PATH; udp:// channels
// need a NIC that receives the multicast. See README.md.
package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"
)

// ---------------------------------------------------------------------------
// Flags / config
// ---------------------------------------------------------------------------

var (
	m3uURL = flag.String("m3u", os.Getenv("IPTV_M3U"), "URL or path of an M3U playlist of udp:// channels for the bridge (default $IPTV_M3U; empty = none, iptv-org lists are client-side)")
	epgURL = flag.String("epg", os.Getenv("IPTV_EPG"), "URL of an XMLTV EPG (default $IPTV_EPG; empty = none)")
	// Loopback-only by default so the bridge isn't exposed on every interface;
	// operators opt into LAN/public exposure with -addr :8080 (the Dockerfile does).
	addr       = flag.String("addr", "127.0.0.1:8080", "listen address")
	iface      = flag.String("iface", "", "IP/interface that receives the multicast; empty = OS default route")
	hlsRoot    = flag.String("hls", filepath.Join(os.TempDir(), "iptv-hls"), "scratch dir for HLS segments")
	idleKill   = flag.Duration("idle", 30*time.Second, "stop a channel's ffmpeg after this long with no requests")
	ffmpeg     = flag.String("ffmpeg", "ffmpeg", "path to the ffmpeg binary")
	maxStreams = flag.Int("max-streams", 24, "max concurrent active ffmpeg streams; further channels get 503 until one frees up")
	corsOrigin = flag.String("cors-origin", "*", "value for Access-Control-Allow-Origin; set to your frontend origin to restrict")
	vaapiNode  = flag.String("vaapi", "", "VAAPI render node (e.g. /dev/dri/renderD128) to hardware-transcode non-H.264 channels (HEVC, MPEG-2) to H.264 on an Intel/AMD iGPU; empty = stream-copy only")
	vBitrate   = flag.String("vbitrate", "4M", "target H.264 bitrate for the VAAPI transcode")
	ffprobe    = flag.String("ffprobe", "ffprobe", "path to ffprobe (used to detect a channel's codec when -vaapi is set)")
)

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

type Channel struct {
	ID    string `json:"id"`    // url-safe slug, used in /hls/{id}/...
	Name  string `json:"name"`  // e.g. "Channel One (HD)"
	Group string `json:"group"` // e.g. "News", "Movies", ...
	Logo  string `json:"logo"`
	TvgID string `json:"tvgId"` // joins to the EPG
	URL   string `json:"-"`     // udp://@225.1.2.249:30120 — never leaked to the client
}

type Programme struct {
	Start string `json:"start"` // RFC3339
	Stop  string `json:"stop"`
	Title string `json:"title"`
	Desc  string `json:"desc,omitempty"`
}

// ---------------------------------------------------------------------------
// M3U parsing
// ---------------------------------------------------------------------------

var (
	reAttr = regexp.MustCompile(`([a-zA-Z0-9-]+)="([^"]*)"`)
	reSlug = regexp.MustCompile(`[^a-z0-9]+`)
)

func slug(name string, used map[string]bool) string {
	s := strings.Trim(reSlug.ReplaceAllString(strings.ToLower(name), "-"), "-")
	base := s
	for i := 2; used[s]; i++ {
		s = fmt.Sprintf("%s-%d", base, i)
	}
	used[s] = true
	return s
}

func parseM3U(body string) []Channel {
	var out []Channel
	used := map[string]bool{}
	sc := bufio.NewScanner(strings.NewReader(body))
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	var cur *Channel
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		switch {
		case strings.HasPrefix(line, "#EXTINF"):
			c := Channel{}
			for _, m := range reAttr.FindAllStringSubmatch(line, -1) {
				switch m[1] {
				case "tvg-id":
					c.TvgID = m[2]
				case "group-title":
					c.Group = m[2]
				case "tvg-logo":
					c.Logo = m[2]
				}
			}
			if i := strings.LastIndex(line, ","); i >= 0 {
				c.Name = strings.TrimSpace(line[i+1:])
			}
			cur = &c
		case line == "" || strings.HasPrefix(line, "#"):
			// comment / separator
		default:
			if cur != nil {
				cur.URL = line
				cur.ID = slug(cur.Name, used)
				out = append(out, *cur)
				cur = nil
			}
		}
	}
	return out
}

// udp://@225.1.2.249:30120 -> normalised with buffering opts for ffmpeg.
// buffer_size is the kernel socket recv buffer that absorbs multicast bursts; the
// OS caps it (Linux net.core.rmem_max, macOS kern.ipc.maxsockbuf), so raise that
// to actually get 8 MiB. fifo_size is ffmpeg's own circular packet buffer.
//
// Only udp:// and rtp:// inputs are accepted: a hostile playlist must not be able
// to talk ffmpeg into opening http://, file:// or other protocols on our behalf.
func ffmpegInput(raw string) (string, error) {
	if !strings.HasPrefix(raw, "udp://") && !strings.HasPrefix(raw, "rtp://") {
		return "", fmt.Errorf("refusing non-udp/rtp input %q", raw)
	}
	hostport := strings.TrimPrefix(strings.TrimPrefix(raw, "udp://@"), "udp://")
	opts := "fifo_size=5000000&overrun_nonfatal=1&buffer_size=8388608"
	if *iface != "" {
		opts += "&localaddr=" + *iface
	}
	return "udp://@" + hostport + "?" + opts, nil
}

// probeCodec returns the primary video codec of input (e.g. "h264", "hevc",
// "mpeg2video") via ffprobe, or "" if it can't be determined. Time-bounded so a
// dead multicast can't hang a channel start. Only called when -vaapi is set.
func probeCodec(parent context.Context, input string) string {
	ctx, cancel := context.WithTimeout(parent, 8*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, *ffprobe,
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=codec_name",
		"-of", "default=noprint_wrappers=1:nokey=1",
		"-analyzeduration", "3000000", "-probesize", "3000000",
		"-i", input,
	).Output()
	if err != nil {
		log.Printf("ffprobe %q: %v (falling back to stream-copy)", input, err)
		return ""
	}
	return firstCodec(string(out))
}

// firstCodec returns the first non-empty line of ffprobe's codec_name output.
// ffprobe can print more than one line for v:0 — the FPT multicast probes as
// "h264\nh264" (multi-program/MPTS) — and a bare TrimSpace keeps the embedded
// newline, so the copy guard (codec == "h264") would miss and needlessly
// hardware-transcode an H.264 channel. The first token is v:0, the same stream
// ffmpeg maps with -map 0:v:0.
func firstCodec(out string) string {
	for _, line := range strings.Split(out, "\n") {
		if s := strings.TrimSpace(line); s != "" {
			return s
		}
	}
	return ""
}

// ---------------------------------------------------------------------------
// Stream manager — one ffmpeg per active channel, reaped when idle
// ---------------------------------------------------------------------------

// errStreamCap is returned by ensure when the concurrency cap is hit; the HTTP
// layer maps it to 503 (vs 404 for an unknown channel).
var errStreamCap = errors.New("stream cap reached")

type stream struct {
	dir        string
	cancel     context.CancelFunc
	lastAccess time.Time
}

type Manager struct {
	root   context.Context // per-stream ctxs derive from this; cancelled on shutdown
	mu     sync.Mutex
	active map[string]*stream
	byID   map[string]Channel
	codecs map[string]string // channel id -> probed video codec (cached; only used with -vaapi)
}

// NewManager binds every stream to root: cancelling root (graceful shutdown)
// tears down all the ffmpegs.
func NewManager(root context.Context, chans []Channel) *Manager {
	m := &Manager{root: root, active: map[string]*stream{}, byID: map[string]Channel{}, codecs: map[string]string{}}
	for _, c := range chans {
		m.byID[c.ID] = c
	}
	go m.reaper()
	return m
}

// ensure starts ffmpeg for id if needed and returns the dir holding index.m3u8.
func (m *Manager) ensure(id string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.active[id]; ok {
		s.lastAccess = time.Now()
		return s.dir, nil
	}
	ch, ok := m.byID[id]
	if !ok {
		return "", fmt.Errorf("unknown channel %q", id)
	}
	// Bound concurrency: an already-active stream above is always served, but a
	// fresh one is refused once we're at the cap (the handler turns this into 503).
	// We never evict a live stream to make room.
	if len(m.active) >= *maxStreams {
		return "", fmt.Errorf("%w (%d active)", errStreamCap, *maxStreams)
	}
	input, err := ffmpegInput(ch.URL)
	if err != nil {
		return "", err
	}
	dir := filepath.Join(*hlsRoot, id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	// Most DVB channels are H.264 and stream-copy straight to HLS — cheap and
	// lossless. Browsers can't play HEVC/MPEG-2 in HLS, so when -vaapi is set we
	// probe the codec once (cached) and hardware-transcode just those channels to
	// H.264 on the iGPU, keeping the host CPU free. The probe runs under the lock on
	// first access only; the result is cached for the server's lifetime.
	hwaccel, video := []string(nil), []string{"-c:v", "copy"}
	if *vaapiNode != "" {
		codec, ok := m.codecs[id]
		if !ok {
			codec = probeCodec(m.root, input)
			m.codecs[id] = codec
		}
		if codec != "" && codec != "h264" {
			hwaccel = []string{"-hwaccel", "vaapi", "-hwaccel_device", *vaapiNode, "-hwaccel_output_format", "vaapi"}
			// scale_vaapi=format=nv12 keeps frames on the GPU and downconverts 10-bit
			// HEVC (Main10) to 8-bit so h264_vaapi can encode them.
			video = []string{"-vf", "scale_vaapi=format=nv12", "-c:v", "h264_vaapi", "-b:v", *vBitrate, "-maxrate", *vBitrate, "-bufsize", "8M", "-profile:v", "main"}
			log.Printf("%s: hardware-transcoding %s -> h264 (vaapi)", id, codec)
		}
	}

	ctx, cancel := context.WithCancel(m.root)
	// Stability over low latency: drop corrupt UDP packets instead of feeding
	// glitches to the muxer, tolerate demux errors, and give the input a deep thread
	// queue so multicast bursts aren't dropped while HLS is written. (No -fflags
	// nobuffer / -flags low_delay — those minimise buffering and micro-stall on
	// jittery multicast.) -hwaccel (if any) must precede -i.
	args := []string{"-hide_banner", "-loglevel", "warning",
		"-fflags", "+discardcorrupt+genpts", "-err_detect", "ignore_err",
		"-thread_queue_size", "1024"}
	args = append(args, hwaccel...)
	args = append(args, "-i", input, "-map", "0:v:0?", "-map", "0:a:0?")
	args = append(args, video...)
	args = append(args, "-c:a", "aac", "-b:a", "128k", // MPEG audio -> AAC for the browser
		// Bound ffmpeg's interleave/muxing buffers. On a glitchy feed (broken
		// timestamps or sparse, corrupt audio) ffmpeg otherwise buffers the other
		// stream without limit — seen ballooning to ~1 GB RSS per channel. Flush
		// interleaving at 1s and cap the muxing queue; on overflow ffmpeg exits and
		// supervise() restarts the channel cleanly instead of growing.
		"-max_interleave_delta", "1000000",
		"-max_muxing_queue_size", "1024",
		"-f", "hls",
		"-hls_time", "2",
		"-hls_list_size", "8",
		"-hls_flags", "delete_segments+append_list+omit_endlist",
		"-hls_segment_filename", filepath.Join(dir, "seg_%05d.ts"),
		filepath.Join(dir, "index.m3u8"),
	)
	// startFFmpeg launches one ffmpeg in its OWN process group (Setpgid) so that on
	// ctx-cancel we can signal the whole group and leave no orphaned ffmpeg children
	// or grandchildren behind. Stderr is piped and scanned line-by-line by stream().
	startFFmpeg := func() (*exec.Cmd, error) {
		cmd := exec.CommandContext(ctx, *ffmpeg, args...)
		cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
		// CommandContext's default Cancel sends SIGKILL to the leader only; replace it
		// with a kill of the whole process group (negative PGID) on ctx cancellation.
		cmd.Cancel = func() error { return killGroup(cmd) }
		stderr, err := cmd.StderrPipe()
		if err != nil {
			return nil, err
		}
		if err := cmd.Start(); err != nil {
			return nil, err
		}
		go scanPrefixed("[ffmpeg "+id+"] ", stderr)
		return cmd, nil
	}
	cmd, err := startFFmpeg()
	if err != nil {
		cancel()
		return "", err
	}
	go m.supervise(ctx, id, cmd, startFFmpeg)
	m.active[id] = &stream{dir: dir, cancel: cancel, lastAccess: time.Now()}
	log.Printf("started %s -> %s", id, ch.URL)
	return dir, nil
}

// supervise keeps ffmpeg running while the channel is wanted. If ffmpeg exits (a
// multicast blip or crash) it reconnects with exponential backoff (1s..30s) so an
// offline channel can't hot-spin; backoff resets once a run survives long enough to
// be considered healthy. It stops the moment ctx is cancelled (idle-reaped or
// shutdown). On a failed Start it does NOT re-Wait the dead cmd — it just backs off.
func (m *Manager) supervise(ctx context.Context, id string, cmd *exec.Cmd, start func() (*exec.Cmd, error)) {
	const (
		minBackoff = time.Second
		maxBackoff = 30 * time.Second
		healthy    = 30 * time.Second // a run this long resets the backoff
	)
	backoff := minBackoff
	for {
		began := time.Now()
		_ = cmd.Wait()
		if ctx.Err() != nil {
			return
		}
		if time.Since(began) >= healthy {
			backoff = minBackoff // it ran fine for a while; treat the next failure fresh
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		if ctx.Err() != nil {
			return
		}
		next, err := start()
		if err != nil {
			log.Printf("restart %s failed: %v", id, err)
			backoff = min(backoff*2, maxBackoff)
			continue // dead on arrival — don't Wait it, just back off
		}
		log.Printf("restarted %s", id)
		backoff = min(backoff*2, maxBackoff)
		cmd = next
	}
}

func (m *Manager) touch(id string) {
	m.mu.Lock()
	if s, ok := m.active[id]; ok {
		s.lastAccess = time.Now()
	}
	m.mu.Unlock()
}

func (m *Manager) reaper() {
	t := time.NewTicker(5 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-m.root.Done():
			return
		case <-t.C:
		}
		m.mu.Lock()
		var dirs []string
		for id, s := range m.active {
			if time.Since(s.lastAccess) > *idleKill {
				s.cancel()
				dirs = append(dirs, s.dir)
				delete(m.active, id)
				log.Printf("reaped idle %s", id)
			}
		}
		m.mu.Unlock()
		// RemoveAll outside the lock — deleting many .ts segments can block, and we
		// don't want to stall ensure()/touch() on every other request meanwhile.
		for _, d := range dirs {
			os.RemoveAll(d)
		}
	}
}

// waitFor blocks (briefly) until path exists, so the first request to a
// freshly-started channel doesn't 404 while ffmpeg spins up.
func waitFor(path string, d time.Duration) bool {
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if _, err := os.Stat(path); err == nil {
			return true
		}
		time.Sleep(150 * time.Millisecond)
	}
	return false
}

// ---------------------------------------------------------------------------
// EPG — fetch XMLTV, cache, expose per-channel JSON
// ---------------------------------------------------------------------------

type xmltv struct {
	Programmes []struct {
		Channel string `xml:"channel,attr"`
		Start   string `xml:"start,attr"` // 20260622073000 +0700
		Stop    string `xml:"stop,attr"`
		Title   string `xml:"title"`
		Desc    string `xml:"desc"`
	} `xml:"programme"`
}

type EPG struct {
	mu   sync.RWMutex
	byCh map[string][]Programme
}

func parseXMLTVTime(s string) string {
	s = strings.TrimSpace(s)
	t, err := time.Parse("20060102150405 -0700", s)
	if err != nil {
		f := strings.Fields(s)
		if len(f) == 0 {
			return s
		}
		if t, err = time.Parse("20060102150405", f[0]); err != nil {
			return s
		}
	}
	return t.Format(time.RFC3339)
}

func (e *EPG) refresh() error {
	body, err := fetch(*epgURL)
	if err != nil {
		return err
	}
	var doc xmltv
	if err := xml.Unmarshal(body, &doc); err != nil {
		return err
	}
	m := map[string][]Programme{}
	for _, p := range doc.Programmes {
		m[p.Channel] = append(m[p.Channel], Programme{
			Start: parseXMLTVTime(p.Start),
			Stop:  parseXMLTVTime(p.Stop),
			Title: p.Title,
			Desc:  p.Desc,
		})
	}
	e.mu.Lock()
	e.byCh = m
	e.mu.Unlock()
	log.Printf("EPG refreshed: %d channels", len(m))
	return nil
}

func (e *EPG) get(tvgID string) []Programme {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.byCh[tvgID]
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

func main() {
	flag.Parse()
	_ = os.MkdirAll(*hlsRoot, 0o755)

	// Root context cancelled on SIGINT/SIGTERM — tears down every ffmpeg + the reaper.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// -m3u is optional: empty = no server-side udp channels, i.e. proxy-only mode
	// for the client-parsed iptv-org lists (the app's default).
	var channels []Channel
	if *m3uURL != "" {
		body, err := fetch(*m3uURL)
		if err != nil {
			log.Fatalf("load m3u: %v", err)
		}
		channels = parseM3U(string(body))
	}
	log.Printf("loaded %d channels", len(channels))
	mgr := NewManager(ctx, channels)

	epg := &EPG{byCh: map[string][]Programme{}}
	if *epgURL != "" {
		go func() {
			if err := epg.refresh(); err != nil {
				log.Printf("epg: %v", err)
			}
			t := time.NewTicker(30 * time.Minute)
			defer t.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-t.C:
					if err := epg.refresh(); err != nil {
						log.Printf("epg: %v", err)
					}
				}
			}
		}()
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/channels", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, channels)
	})

	mux.HandleFunc("/api/epg", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("channel") // accepts channel id OR tvg-id
		tvg := id
		for _, c := range channels {
			if c.ID == id {
				tvg = c.TvgID
				break
			}
		}
		writeJSON(w, epg.get(tvg))
	})

	// /hls/{id}/index.m3u8  and  /hls/{id}/seg_00001.ts
	mux.HandleFunc("/hls/", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		parts := strings.SplitN(strings.TrimPrefix(r.URL.Path, "/hls/"), "/", 2)
		if len(parts) != 2 {
			http.NotFound(w, r)
			return
		}
		id, file := parts[0], parts[1]
		dir, err := mgr.ensure(id)
		if err != nil {
			// at the concurrency cap -> 503 (retryable); unknown channel -> 404.
			code := http.StatusNotFound
			if errors.Is(err, errStreamCap) {
				code = http.StatusServiceUnavailable
			}
			http.Error(w, err.Error(), code)
			return
		}
		mgr.touch(id)
		full := filepath.Join(dir, filepath.Base(file))
		if strings.HasSuffix(file, ".m3u8") {
			w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
			waitFor(full, 8*time.Second)
		} else {
			w.Header().Set("Content-Type", "video/mp2t")
		}
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, full)
	})

	// /proxy?url=<m3u8|segment> — CORS proxy for direct (iptv-org) HLS streams
	// that don't send CORS headers, so browsers without native HLS can play them.
	mux.HandleFunc("/proxy", proxyHLS)

	// Liveness probe for container healthchecks.
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	srv := &http.Server{Addr: *addr, Handler: cors(mux)}
	go func() {
		<-ctx.Done()
		log.Printf("shutting down…")
		sctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(sctx)
	}()

	log.Printf("listening on %s  (hls scratch: %s)", *addr, *hlsRoot)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server: %v", err)
	}
	_ = os.RemoveAll(*hlsRoot) // scratch cleanup on the way out
	log.Printf("bye")
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// httpClient bounds EPG/M3U fetches so a slow or hostile feed can't hang the
// process indefinitely.
var httpClient = &http.Client{Timeout: 15 * time.Second}

func fetch(src string) ([]byte, error) {
	if !strings.HasPrefix(src, "http") {
		return os.ReadFile(src)
	}
	resp, err := httpClient.Get(src)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	// Cap the body so a huge/hostile feed can't OOM us.
	return io.ReadAll(io.LimitReader(resp.Body, 64<<20))
}

// ---------------------------------------------------------------------------
// HLS CORS proxy — lets browsers without native HLS (Chrome/Firefox) play
// direct iptv-org streams that don't send CORS headers.
// ---------------------------------------------------------------------------

var reURIAttr = regexp.MustCompile(`URI="([^"]*)"`)

// proxyClient fetches upstream stream URLs with an SSRF-safe dialer: the host is
// resolved and each candidate IP is checked at DIAL time (defeating DNS
// rebinding); only a non-internal address is dialled.
var proxyClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		DialContext:         safeDial,
		MaxIdleConns:        64,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
	},
}

func proxyURLAllowed(raw string) bool {
	if raw == "" {
		return false
	}
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https")
}

func isBlockedIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsInterfaceLocalMulticast()
}

func safeDial(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
	if err != nil {
		return nil, err
	}
	for _, ip := range ips {
		if isBlockedIP(ip) {
			continue
		}
		d := net.Dialer{Timeout: 10 * time.Second}
		return d.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
	}
	return nil, fmt.Errorf("no allowed address for %q", host)
}

func proxyHLS(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	target := r.URL.Query().Get("url")
	if !proxyURLAllowed(target) {
		http.Error(w, "invalid or blocked url", http.StatusBadRequest)
		return
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, target, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	if rng := r.Header.Get("Range"); rng != "" {
		req.Header.Set("Range", rng)
	}
	req.Header.Set("User-Agent", "iptv-bridge")
	resp, err := proxyClient.Do(req)
	if err != nil {
		http.Error(w, "upstream: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	br := bufio.NewReader(resp.Body)
	// Detect an HLS manifest even when the upstream prefixes a UTF-8 BOM or
	// leading whitespace (some CDNs do) — peek a little, strip those, then match.
	head, _ := br.Peek(64)
	head = bytes.TrimLeft(bytes.TrimPrefix(head, []byte("\xef\xbb\xbf")), " \t\r\n")
	if bytes.HasPrefix(head, []byte("#EXTM3U")) {
		// HLS manifest — rewrite child URLs back through this proxy.
		body, err := io.ReadAll(io.LimitReader(br, 8<<20))
		if err != nil {
			http.Error(w, "read: "+err.Error(), http.StatusBadGateway)
			return
		}
		// Drop a leading BOM so the first directive stays a comment, not a URI.
		text := string(bytes.TrimPrefix(body, []byte("\xef\xbb\xbf")))
		w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = io.WriteString(w, rewriteManifest(text, target))
		return
	}
	// Segment / key / binary — stream through, preserving type + range.
	for _, h := range []string{"Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"} {
		if v := resp.Header.Get(h); v != "" {
			w.Header().Set(h, v)
		}
	}
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, io.LimitReader(br, 256<<20))
}

// rewriteManifest resolves every child URI against the manifest's own URL and
// rewrites it to /proxy?url=<abs>, so segments, variant playlists and key URIs
// all flow back through this proxy (and inherit its CORS headers).
func rewriteManifest(body, manifestURL string) string {
	base, err := url.Parse(manifestURL)
	if err != nil {
		return body
	}
	var out strings.Builder
	sc := bufio.NewScanner(strings.NewReader(body))
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	for sc.Scan() {
		line := sc.Text()
		t := strings.TrimSpace(line)
		switch {
		case t == "":
			// keep blank line
		case strings.HasPrefix(t, "#"):
			line = reURIAttr.ReplaceAllStringFunc(line, func(m string) string {
				return `URI="` + proxify(base, reURIAttr.FindStringSubmatch(m)[1]) + `"`
			})
		default:
			line = proxify(base, t)
		}
		out.WriteString(line)
		out.WriteByte('\n')
	}
	return out.String()
}

func proxify(base *url.URL, ref string) string {
	abs := ref
	if u, err := url.Parse(ref); err == nil {
		abs = base.ResolveReference(u).String()
	}
	return "/proxy?url=" + url.QueryEscape(abs)
}

func writeJSON(w http.ResponseWriter, v any) {
	setCORS(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", *corsOrigin)
	w.Header().Set("Access-Control-Allow-Headers", "*")
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// killGroup signals the whole process group of cmd (negative PGID, set up via
// Setpgid) so ffmpeg and any children die together — no orphans on ctx-cancel.
func killGroup(cmd *exec.Cmd) error {
	if cmd.Process == nil {
		return nil
	}
	if err := syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL); err != nil {
		return cmd.Process.Kill() // fall back to the leader
	}
	return nil
}

// scanPrefixed copies r (ffmpeg stderr) to the log line-by-line, prefixed, so a
// single ffmpeg log line is never split across writes or garbled.
func scanPrefixed(prefix string, r io.Reader) {
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 64*1024), 1<<20)
	for sc.Scan() {
		log.Print(prefix, sc.Text())
	}
}
