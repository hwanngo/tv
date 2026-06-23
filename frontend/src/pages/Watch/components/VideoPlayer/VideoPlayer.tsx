import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { csx } from '@utils/cssString';
import type { Playback } from '@utils/resolveSrc';
import { useFullscreen } from '@hooks/useFullscreen';
import { useBreakpoint } from '@hooks/useBreakpoint';
import useStore from '@store/store';
import Icon from '@components/Icon';
import Spinner from '@components/Spinner';
import DirectVideo from './DirectVideo';

// How long to wait for a stream to start before declaring it failed (then retry).
const GIVE_UP_BRIDGE_MS = 25000; // first cold bridge warmup
const GIVE_UP_DIRECT_MS = 12000; // first direct attempt
const GIVE_UP_RETRY_MS = 12000; // subsequent retries (channel should be warm by now)
const RETRY_MS = 4000; // gap before re-attempting after a failure
const SLOW_RETRY_MS = 15000; // backed-off retry once it looks offline
const MAX_FAST_ATTEMPTS = 4; // after this many, show "unavailable" but keep slow-retrying
const IDLE_MS = 3000;

const ICON_BTN =
  'display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:none;background:transparent;color:#fff;cursor:pointer;border-radius:9999px;flex:none';

/** Live player modelled on the netflik player's handle logic: imperative <video>
 *  event handling, a custom auto-hiding control bar (play/pause · LIVE · volume ·
 *  fullscreen — no seek bar, it's live), a single buffering spinner, and
 *  click/double-click play-pause/fullscreen. */
const VideoPlayer = ({ playback, onConfigure }: { playback: Playback; onConfigure?: () => void }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(() => useStore.getState().muted); // persisted preference; usePlayer falls back to muted only if autoplay is blocked
  const [volume, setVolume] = useState(() => useStore.getState().volume);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const { t } = useTranslation();
  const idleRef = useRef<number | undefined>(undefined);
  const attemptsRef = useRef(0);
  attemptsRef.current = attempts;

  const mob = useBreakpoint() === 'mobile';
  const persistMuted = useStore((s) => s.setMuted);
  const persistVolume = useStore((s) => s.setVolume);
  const storeMuted = useStore((s) => s.muted);
  // The browser mutes the landing-page autoplay (there was no user gesture).
  // "autoMuted" = muted ONLY for that reason — the saved preference is sound-on.
  const autoMuted = muted && !storeMuted;

  const setVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    setVideoEl(el);
  }, []);

  // On fullscreen exit, drop the native controls we turn on for the mobile handoff.
  const onFsChange = useCallback((v: boolean) => {
    setIsFs(v);
    if (!v && videoRef.current) videoRef.current.controls = false;
  }, []);
  // Mobile: fullscreen the <video> itself for the OS's native player; desktop/tablet
  // uses the wrapper (our custom control bar).
  const { toggleFs } = useFullscreen(wrapRef, videoRef, onFsChange, mob);

  const streamKey = playback.kind === 'needsBridge' ? 'none' : playback.url;

  // Reveal the control bar and (re)arm the 3s idle timer (auto-hide while playing).
  const reveal = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setControlsVisible(false);
    }, IDLE_MS);
  }, []);

  // loading / failed / playing / volume lifecycle, driven by real media events.
  useEffect(() => {
    setFailed(false);
    setLoading(true);
    if (!videoEl || playback.kind === 'needsBridge') return;

    const limit =
      attemptsRef.current > 0
        ? GIVE_UP_RETRY_MS
        : playback.kind === 'bridge'
          ? GIVE_UP_BRIDGE_MS
          : GIVE_UP_DIRECT_MS;
    const giveUp = window.setTimeout(() => setFailed(true), limit);
    let started = false;
    const onPlaying = () => {
      started = true;
      setPlaying(true);
      setLoading(false);
      setFailed(false);
      window.clearTimeout(giveUp);
      reveal();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setControlsVisible(true);
      window.clearTimeout(idleRef.current);
    };
    const onWaiting = () => {
      if (!started) setLoading(true);
    };
    const onVolume = () => {
      setMuted(videoEl.muted);
      setVolume(videoEl.volume);
    };

    videoEl.addEventListener('playing', onPlaying);
    videoEl.addEventListener('canplay', onPlaying);
    videoEl.addEventListener('play', onPlay);
    videoEl.addEventListener('pause', onPause);
    videoEl.addEventListener('loadstart', onWaiting);
    videoEl.addEventListener('waiting', onWaiting);
    videoEl.addEventListener('stalled', onWaiting);
    videoEl.addEventListener('volumechange', onVolume);
    return () => {
      window.clearTimeout(giveUp);
      videoEl.removeEventListener('playing', onPlaying);
      videoEl.removeEventListener('canplay', onPlaying);
      videoEl.removeEventListener('play', onPlay);
      videoEl.removeEventListener('pause', onPause);
      videoEl.removeEventListener('loadstart', onWaiting);
      videoEl.removeEventListener('waiting', onWaiting);
      videoEl.removeEventListener('stalled', onWaiting);
      videoEl.removeEventListener('volumechange', onVolume);
    };
  }, [videoEl, streamKey, playback.kind, reveal]);

  // Reassert the persisted mute + volume on the active element.
  useEffect(() => {
    if (!videoEl) return;
    videoEl.muted = muted;
    videoEl.volume = volume;
  }, [videoEl, muted, volume, streamKey]);

  // Sound-on: the browser forces the landing-page autoplay to muted. Like netflik
  // (whose player opens from a click → a gesture that permits unmuted playback),
  // bring sound back on the first user interaction anywhere. The control bar stops
  // propagation, so this never fights the mute button.
  useEffect(() => {
    if (!autoMuted) return;
    const unmute = () => {
      const v = videoRef.current;
      if (v) {
        v.muted = false;
        void v.play().catch(() => {});
      }
    };
    document.addEventListener('click', unmute, { once: true });
    return () => document.removeEventListener('click', unmute);
  }, [autoMuted]);

  // Fresh channel → reset the retry counter.
  useEffect(() => {
    setAttempts(0);
  }, [streamKey]);

  // Auto-retry a failed warmup: bumping `attempts` re-mounts the <video> (key
  // below) for a fresh hls.js + giveUp, so a slow/flaky bridge warmup or a
  // transient drop recovers on its own instead of leaving the player stuck on
  // the error overlay. Fast retries first, then back off — but keep trying so a
  // channel that comes back still recovers.
  useEffect(() => {
    if (!failed || playback.kind === 'needsBridge') return;
    const delay = attempts < MAX_FAST_ATTEMPTS ? RETRY_MS : SLOW_RETRY_MS;
    const id = window.setTimeout(() => setAttempts((a) => a + 1), delay);
    return () => window.clearTimeout(id);
  }, [failed, attempts, playback.kind]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    persistMuted(v.muted); // persist the user's choice (not the autoplay fallback)
  };
  const onVolumeInput = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = value;
    v.muted = value === 0;
    persistVolume(value);
    persistMuted(value === 0);
  };

  const needsBridge = playback.kind === 'needsBridge';
  const givenUp = attempts >= MAX_FAST_ATTEMPTS; // looks genuinely offline
  // Drive overlays off loading/failed (real media state), not the play/pause
  // intent flag — the 'play' event fires the instant play() is called, before any
  // data, so a stalled-at-0 warmup would otherwise hide the spinner.
  const showOffline = !needsBridge && failed && givenUp;
  const blocked = needsBridge || showOffline; // no video to interact with
  const showSpinner = !blocked && (loading || failed);
  const reconnecting = failed || attempts > 0;
  const showBar = !blocked;
  const volIcon = muted || volume === 0 ? 'volumeMute' : 'volume';

  return (
    <div
      ref={wrapRef}
      onMouseMove={reveal}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onClick={() => {
        if (blocked || autoMuted) return; // first click brings sound (handled above), no pause
        togglePlay();
      }}
      onDoubleClick={() => !blocked && toggleFs()}
      style={{
        position: 'relative',
        ...(isFs
          ? { width: '100%', height: '100%' }
          : mob
            ? // full-bleed on mobile (negate the 16px page padding)
              { width: 'calc(100% + 32px)', marginLeft: -16, marginRight: -16, aspectRatio: '16/9', borderRadius: 0 }
            : { width: '100%', aspectRatio: '16/9', borderRadius: 12 }),
        background: '#000',
        overflow: 'hidden',
        cursor: !blocked && !controlsVisible ? 'none' : 'auto',
      }}
    >
      {!needsBridge ? (
        <DirectVideo
          key={`${streamKey}:${attempts}`}
          url={playback.url}
          muted={muted}
          preferNative={playback.kind === 'direct'}
          onVideoEl={setVideo}
        />
      ) : null}

      {blocked && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'rgba(0,0,0,0.78)',
            color: '#fff',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          <Icon name="cast" size={32} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, maxWidth: 320 }}>
            {needsBridge ? t('iptv.player.needsBridge') : t('iptv.player.unavailable')}
          </p>
          {needsBridge && (
            <button
              type="button"
              onClick={onConfigure}
              style={csx(
                'height:44px;padding:0 18px;border:none;border-radius:9999px;background:rgba(255,255,255,.15);color:#fff;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;backdrop-filter:blur(4px)'
              )}
            >
              {t('iptv.player.configure')}
            </button>
          )}
        </div>
      )}

      {showSpinner && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'rgba(0,0,0,0.55)',
            pointerEvents: 'none',
          }}
        >
          <Spinner size="lg" />
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            {t(reconnecting ? 'iptv.player.reconnecting' : 'iptv.player.loading')}
          </p>
        </div>
      )}

      {showBar && (
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '28px 12px 12px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            opacity: controlsVisible ? 1 : 0,
            transition: 'opacity .2s ease',
            pointerEvents: controlsVisible ? 'auto' : 'none',
          }}
        >
          {/* play / pause */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={t(playing ? 'iptv.player.pause' : 'iptv.player.play')}
            style={csx(ICON_BTN)}
          >
            <Icon name={playing ? 'pause' : 'play'} size={20} />
          </button>

          {/* LIVE tag (red dot) — replaces the seek/time bar */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.5px',
              color: '#fff',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FE592A', animation: 'lp 1.4s infinite' }} />
            {t('iptv.epg.live')}
          </span>

          {/* volume: mute toggle + slider */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={t(muted ? 'iptv.player.unmute' : 'iptv.player.mute')}
              style={csx(ICON_BTN)}
            >
              <Icon name={volIcon} size={18} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => onVolumeInput(parseFloat(e.target.value))}
              aria-label={t('iptv.player.volume')}
              style={{ width: 84, height: 18, accentColor: '#FE592A', cursor: 'pointer' }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* fullscreen */}
          <button
            type="button"
            onClick={toggleFs}
            aria-label={t(isFs ? 'iptv.player.exitFullscreen' : 'iptv.player.fullscreen')}
            style={csx(ICON_BTN)}
          >
            <Icon name={isFs ? 'fsOut' : 'fsIn'} size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
