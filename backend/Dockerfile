# syntax=docker/dockerfile:1

# ---- build stage: compile a static, dependency-free Go binary ----
FROM golang:1.26-alpine AS build
WORKDIR /src
# The module has zero third-party deps, so the whole source copies in one layer.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/iptv-bridge .

# ---- runtime stage: tiny alpine + ffmpeg ----
FROM alpine:3.24 AS runtime
# ffmpeg remuxes UDP->HLS (and VAAPI-transcodes HEVC/MPEG-2 when -vaapi is set);
# intel-media-driver = the iHD VAAPI driver for Intel Gen8+ iGPUs (e.g. HD 630);
# libva-utils ships `vainfo` for debugging; ca-certificates for HTTPS EPG/M3U;
# tzdata so EPG timestamps render in Asia/Ho_Chi_Minh. (driver pkgs live in the
# alpine community repo.)
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/v3.24/community \
      ffmpeg ca-certificates tzdata intel-media-driver libva-utils \
 && addgroup -S app && adduser -S -G app app
COPY --from=build /out/iptv-bridge /usr/local/bin/iptv-bridge
ENV TZ=Asia/Ho_Chi_Minh \
    LIBVA_DRIVER_NAME=iHD
# Non-root: joining LAN multicast needs no privileged port or root.
USER app
# Liveness for `docker compose`'s service_healthy gate (busybox wget is built in).
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["iptv-bridge"]
# Bind all interfaces inside the container; override via compose `command:`.
CMD ["-addr", ":8080"]
