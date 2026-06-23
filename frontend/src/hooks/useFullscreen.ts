import { useCallback, useEffect, type RefObject } from 'react';

// Vendor-prefixed fullscreen APIs (Safari / iOS) — not in the standard lib types.
declare global {
  interface HTMLElement {
    webkitRequestFullscreen?: () => void;
  }
  interface HTMLVideoElement {
    webkitEnterFullscreen?: () => void;
    webkitSupportsFullscreen?: boolean;
  }
  interface Document {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => void;
  }
}

/** Cross-browser fullscreen for the player wrapper. Element fullscreen on
 *  desktop/Android/iPad/older Safari; iPhone falls back to the proprietary
 *  <video> webkitEnterFullscreen() (its only fullscreen path). `onChange`
 *  reports the current state so the caller can swap the enter/exit glyph. */
export function useFullscreen(
  wrapRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  onChange: (inFullscreen: boolean) => void,
  preferVideo = false,
) {
  const toggleFs = useCallback(() => {
    const wrap = wrapRef.current;
    const video = videoRef.current;

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      void (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
      return;
    }
    // Mobile: hand off to the OS's native video player.
    if (preferVideo && video) {
      if (video.webkitEnterFullscreen && video.webkitSupportsFullscreen) {
        video.webkitEnterFullscreen(); // iPhone (only fullscreen path it offers)
        return;
      }
      if (video.requestFullscreen) {
        video.controls = true; // native controls inside the fullscreen <video> (Android)
        void video.requestFullscreen().catch(() => {});
        return;
      }
    }
    // Desktop / tablet: element fullscreen so our custom control bar stays.
    if (wrap?.requestFullscreen) {
      void wrap.requestFullscreen().catch(() => {});
      return;
    }
    if (wrap?.webkitRequestFullscreen) {
      wrap.webkitRequestFullscreen();
      return;
    }
    if (video?.webkitEnterFullscreen && video.webkitSupportsFullscreen) {
      video.webkitEnterFullscreen();
    }
  }, [wrapRef, videoRef, preferVideo]);

  useEffect(() => {
    const onFsChange = () => {
      onChange(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [onChange]);

  return { toggleFs };
}
