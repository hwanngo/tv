# IPTV Play

A self-hosted live-IPTV web player. A React 19 single-page app talks to a small
Go bridge that turns multicast **UDP** TV streams into browser-playable **HLS**
and proxies direct (iptv-org) streams past CORS. Vietnamese-first UI, smooth
deep-buffered live playback, a searchable country picker, and an EPG.

## What you get

- **Two stream sources, one player** — multicast `udp://` channels via the Go
  bridge's HLS output, and direct `http(s)` streams (any iptv-org country list)
  routed through the bridge's CORS proxy.
- **Smooth live playback** — hls.js tuned for a deep buffer (a few seconds behind
  the live edge) so multicast/ffmpeg jitter doesn't stutter. Smoothness is
  prioritised over minimum latency.
- **Sound on by default** — autoplay starts muted (browser policy) and unmutes on
  your first interaction; your mute/volume choice is remembered.
- **Searchable source picker** — every iptv-org country (flag + name, filter as you
  type).
- **EPG** — now/next and a timeline from an XMLTV guide.
- **Vietnamese by default**, English available; dark UI.

## Layout

Monorepo:

- **`frontend/`** — React 19 + Vite + TypeScript SPA (Tailwind v4, Zustand,
  TanStack Router/Query, react-i18next, Vitest).
- **`backend/`** — a single-file Go service: UDP→HLS bridge (spawns ffmpeg per
  channel) + an HLS CORS proxy + channel/EPG JSON endpoints.

The SPA reaches the bridge **same-origin at `/bridge`** (Vite proxies it in dev,
nginx in production), so there is no backend URL to configure.

## Develop

Needs Node + pnpm, and — for the backend — Go and ffmpeg, plus access to the
multicast network for `udp://` channels.

```bash
make dev        # frontend on :5173, backend on :8080 (proxied at /bridge)
```

Before pushing:

```bash
make check          # lint + type-check + test
make build-frontend # production build
```

`make help` lists every target. Use **pnpm** only, run inside `frontend/`.

## Deploy (Docker, Linux home server)

Two small multi-stage images:

| Service    | Build base           | Runtime base                       | Serves           |
| ---------- | -------------------- | ---------------------------------- | ---------------- |
| `frontend` | `node:24-alpine`     | `nginxinc/nginx-unprivileged:1.30` | `:10034` (web UI) |
| `backend`  | `golang:1.26-alpine` | `alpine:3.24` + ffmpeg             | `:10033` (bridge) |

On a Linux host (e.g. Ubuntu) that sits on the IPTV multicast network:

```bash
docker compose up --build
```

Open **http://&lt;server-ip&gt;:10034** from any device on the network. There is nothing
to configure — the SPA talks to the bridge through nginx at `/bridge`.

**How it's wired.** Both services use `network_mode: host` (the bridge must join
LAN multicast, which Docker's bridge network doesn't forward). The backend listens
on **`:10033`** (LAN-reachable); nginx serves the web UI on **`:10034`** and also
reverse-proxies **`/bridge` → `127.0.0.1:10033`**, so the SPA reaches the bridge
same-origin (no CORS, no backend URL to type) while the bridge stays directly
reachable on `:10033` too. A `/healthz` check gates the frontend's startup. (Ports
and container names — `iptv-web` / `iptv-bridge` — are set in `docker-compose.yml`.)

**Multicast.** The backend joins multicast UDP groups and remuxes to HLS with
ffmpeg. A Linux host on the multicast network works; if multicast arrives on a
specific NIC, uncomment `-iface` in `docker-compose.yml`. Docker Desktop
(macOS/Windows) runs in a VM that can't see LAN multicast, so `udp://` channels
won't play there — use a real Linux host. (iptv-org country lists are plain HTTP
and work anywhere.)

**Smooth multicast (host tuning).** The bridge asks ffmpeg for an 8 MB UDP receive
buffer to absorb multicast bursts, but Linux clamps it to `net.core.rmem_max`
(~208 KB by default) — too small, so bursts overflow and packets drop, showing up
as `Packet corrupt` / `no frame` and visible glitching. Raise it on the **host**
(`network_mode: host` means the container can't set it itself):

```bash
sudo sysctl -w net.core.rmem_max=33554432
echo 'net.core.rmem_max=33554432' | sudo tee /etc/sysctl.d/99-iptv.conf && sudo sysctl --system
```

**Change the channel list / EPG.** Set `IPTV_M3U` (a `udp://` playlist URL) and
`IPTV_EPG` (an XMLTV URL) in `.env` — the backend reads them as its `-m3u` / `-epg`
defaults (copy `.env.example` to start). Leave them empty for proxy-only mode.
iptv-org country lists need no server config — pick one in Source settings.

**Hardware transcoding (HEVC channels).** Browsers can't play HEVC/H.265 (or
MPEG-2) over HLS, so those channels fail under a plain stream-copy. The bridge
probes each channel and, when `-vaapi` is set, hardware-transcodes only the
non-H.264 ones to H.264 on an Intel/AMD iGPU — H.264 channels keep the lossless
copy, so the weak host CPU stays idle. `docker-compose.yml` enables this for an
Intel iGPU (e.g. the i3-7100T's HD 630, which does HEVC decode + H.264 encode in
hardware). Before deploying, set your host's **render group GID** via `RENDER_GID`
in `.env` (find it with `getent group render | cut -d: -f3`; compose defaults to
`110`) so the container can open `/dev/dri/renderD128`, then verify the GPU with
`docker compose exec backend vainfo` (it should list `VAProfileH264…` and
`VAProfileHEVC…`). No iGPU? Remove the `-vaapi` / `devices` / `group_add` lines
(HEVC channels then simply won't play).

Notes: HLS segments are scratch (no volume needed); `-max-streams` caps concurrent
ffmpeg streams (default 24); build one image with `docker compose build backend`.

## Configure

Open **Source settings** (the gear) to pick a country (any iptv-org list) or set
your own playlist, EPG, or bridge URL. The backend's own `udp://` channels come
from `.env` (`IPTV_M3U` / `IPTV_EPG`; see `.env.example`); iptv-org country lists
need no server config.

## Project structure

```
frontend/src/
├── pages/Watch/       # the player, channel list/carousel, EPG, source settings
│   ├── components/     # VideoPlayer, ChannelDrawer, SourceSelect, Epg*, AppHeader
│   └── watchStyles.ts  # shared style helpers for the Watch UI
├── hooks/             # usePlayer (hls.js), useChannels, useCountries, useFocusTrap…
├── store/             # Zustand slices + persist + versioned migrate
├── utils/             # resolveSrc (playback resolution), m3u/epg parsing
├── constants/         # iptv-org URLs, curated fallback channel list
└── locales/           # vi-VN + en-US (bundled at build time)

backend/
└── main.go            # UDP→HLS bridge, HLS CORS proxy, channel/EPG API
```
