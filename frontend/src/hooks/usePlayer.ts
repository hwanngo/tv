import { useEffect, type RefObject } from 'react';
import type HlsType from 'hls.js';
import { isHlsUrl } from '@utils/resolveSrc';

// The Go bridge spawns ffmpeg on first hit and returns 404s for several seconds
// until the HLS manifest exists, then joins the multicast mid-GOP (transient
// decode/mux errors until the next keyframe). Keep retrying through all of that;
// the VideoPlayer decides when to give up (timeout) and what to show.
const MAX_RECOVER = 30;
const RETRY_DELAY_MS = 1000;

/** Attach `url` to the <video> element, using hls.js for .m3u8 where the browser
 *  lacks native HLS. Retries transient warmup/network/media errors internally;
 *  surfaces no error itself (the component drives the UI from media events). */
export function usePlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  url: string,
  preferNative = false
): void {
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !url) return;
    let hls: InstanceType<typeof HlsType> | null = null;
    let cancelled = false;
    let recover = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Resuming a paused live stream: while paused, the live edge slides forward
    // and the old position's segments get evicted from the bridge's DVR window,
    // so a plain play() stalls on a gone segment. Jump to the live edge on
    // resume. The initial autoplay has no preceding pause, so it keeps hls.js's
    // deep-buffer sync position untouched.
    let wasPaused = false;
    const onPause = () => {
      wasPaused = true;
    };
    const onResume = () => {
      if (cancelled || !wasPaused) return;
      wasPaused = false;
      const sync =
        hls && hls.liveSyncPosition != null && Number.isFinite(hls.liveSyncPosition)
          ? hls.liveSyncPosition
          : null;
      try {
        if (sync != null) v.currentTime = sync;
        else if (v.seekable.length) v.currentTime = v.seekable.end(v.seekable.length - 1);
      } catch {
        /* not seekable yet */
      }
    };
    v.addEventListener('pause', onPause);
    v.addEventListener('play', onResume);

    // Try unmuted autoplay; if the browser blocks it (no media engagement), fall
    // back to muted autoplay so the stream still starts.
    const tryPlay = (el: HTMLVideoElement) => {
      void el.play().catch(() => {
        el.muted = true;
        void el.play().catch(() => {});
      });
    };

    const playNative = (u: string) => {
      v.src = u;
      tryPlay(v);
    };

    // Prefer the browser's native HLS (Safari/iOS) for direct streams: native
    // media playback isn't bound by the XHR CORS that blocks hls.js, so a
    // CORS-restricted iptv-org stream still plays. Bridge streams keep hls.js for
    // its deep-buffer live smoothing.
    // Proxied streams wrap the original URL in a ?url= param — detect HLS from the
    // unwrapped URL so the right player path is chosen.
    const wrapped = url.match(/[?&]url=([^&]+)/);
    const effectiveUrl = wrapped ? decodeURIComponent(wrapped[1]) : url;
    const nativeHls = v.canPlayType('application/vnd.apple.mpegurl') !== '';
    if (isHlsUrl(effectiveUrl) && !(preferNative && nativeHls)) {
      void import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) return;
        if (!Hls.isSupported()) {
          playNative(url);
          return;
        }
        const v2 = videoRef.current;
        // Balanced live tuning for the Go HLS bridge: sit ~4s back from the live
        // edge (2 × 2s segments, well inside the bridge's 8-segment/16s window) —
        // close enough for ~3-5s latency, yet enough buffer to ride out
        // multicast/ffmpeg jitter. Skip small gaps (maxBufferHole/nudge) instead
        // of freezing on a dropped packet. It's live TV — nobody rewinds — so keep
        // only a small back buffer and hard-cap forward growth, bounding memory.
        hls = new Hls({
          lowLatencyMode: false,
          liveSyncDurationCount: 2,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          backBufferLength: 10,
          maxBufferHole: 0.5,
          nudgeOffset: 0.2,
          nudgeMaxRetry: 6,
        });
        hls.loadSource(url);
        hls.attachMedia(v2);
        hls.on(Hls.Events.MANIFEST_PARSED, () => tryPlay(v2));
        // Healthy buffering => reset the retry budget so a later blip gets a fresh start.
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          recover = 0;
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal || cancelled || !hls || recover >= MAX_RECOVER) return;
          recover++;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            // network / mux / other — wait, then re-load the manifest.
            retryTimer = setTimeout(() => {
              if (!cancelled && hls) {
                try {
                  hls.startLoad();
                } catch {
                  /* instance torn down */
                }
              }
            }, RETRY_DELAY_MS);
          }
        });
      });
    } else {
      playNative(url);
    }

    return () => {
      cancelled = true;
      v.removeEventListener('pause', onPause);
      v.removeEventListener('play', onResume);
      if (retryTimer) clearTimeout(retryTimer);
      if (hls) hls.destroy();
      v.removeAttribute('src');
      v.load();
    };
  }, [videoRef, url, preferNative]);
}
