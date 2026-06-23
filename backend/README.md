# IPTV Play Bridge (Go)

One small Go service that makes the UDP-multicast IPTV playlist playable in a browser.
Single language, single binary. Your **React + Vite** app talks to it over HTTP.

```
React+Vite ──HTTP──▶  Go bridge ──ffmpeg──▶  UDP multicast (udp://@225.x.x.x:30120)
   hls.js              :8080                  (UDP network only)
```

## Why it's needed
The playlist entries are `udp://@225.1.x.x:30120` — UDP multicast that no browser can play.
The bridge joins the multicast and **remuxes to HLS on demand** (video copied, audio → AAC),
so `hls.js` can play it. It also serves the channel list and EPG as JSON with CORS.

## Requirements
- Go 1.26+
- **ffmpeg** on `PATH`
- The machine must be on the network that **receives the UDP multicast** (this won't work
  from an arbitrary internet host).

## Run
```bash
cd backend
go run . \
  -m3u   <your-udp-playlist.m3u> \   # optional — udp:// channels for the bridge
  -epg   <your-epg.xml> \            # optional
  -addr  :8080 \
  -iface 192.168.1.10                # IP of the NIC that receives the multicast (optional)
```
With no `-m3u`/`-epg` it runs proxy-only (iptv-org country lists are parsed
client-side and need no server config). Build a binary: `go build -o iptv-bridge .`

## Endpoints (what the front-end calls)
| Method | Path | Returns |
|---|---|---|
| GET | `/api/channels` | `Channel[]` — `{id,name,group,logo,tvgId}` (no UDP URL) |
| GET | `/api/epg?channel={id\|tvgId}` | `Programme[]` — `{start,stop,title,desc?}` (RFC3339) |
| GET | `/hls/{id}/index.m3u8` | HLS playlist — **starts ffmpeg** for that channel on first hit |
| GET | `/hls/{id}/seg_*.ts` | HLS segments |

In the React app, point the player at `` `${BACKEND}/hls/${channel.id}/index.m3u8` ``.

## How streaming works
- First request to a channel's `index.m3u8` spawns `ffmpeg` for it; the handler waits up to
  ~8s for the playlist to appear, then serves it.
- One ffmpeg per **distinct** channel, shared across all viewers.
- A reaper stops any ffmpeg with no request in the last `-idle` (default 30s) and deletes its
  segment dir, so idle channels cost nothing.

## Tuning / gotchas
- **Latency** ≈ `hls_time`×`hls_list_size` (~6–10s). Lower for less delay, higher for stability.
  For tighter latency switch to fMP4 segments (`-hls_segment_type fmp4`) / LL-HLS.
- **UDP receive buffer**: the bridge asks for an 8 MB socket buffer to soak up multicast
  bursts, but the OS caps it — Linux `net.core.rmem_max` (default ~208 KB), macOS
  `kern.ipc.maxsockbuf`. If ffmpeg logs `attempted to set receive buffer to size … only
  ended up set as …`, raise it (`sudo sysctl -w net.core.rmem_max=33554432`) or bursts
  overflow and the video corrupts (`Packet corrupt` / `no frame`).
- **HEVC/MPEG-2 channels** can't be `-c:v copy`'d into browser HLS. Pass
  `-vaapi /dev/dri/renderD128` and the bridge probes each channel and hardware-
  transcodes just those to H.264 on an Intel/AMD iGPU (H.264 stays a lossless copy).
- **Multi-homed hosts**: pass the multicast NIC via `-iface` (sets ffmpeg `localaddr`) or fix
  your OS multicast route, or ffmpeg may join on the wrong interface.
- CORS is `*` on every response so Vite's dev origin can call it directly; lock it down for prod.
