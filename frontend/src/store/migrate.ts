import { DEFAULT_SOURCE } from '@constants/iptv';

// The persist key is 'iptv-play' (renamed from 'spa-boilerplate' at store v6), so
// there is no pre-v6 state to climb through. Beyond the v7 step below, this guards
// only against hand-edited / partially-written localStorage.
const migrate = (persistedState: unknown, version?: number): unknown => {
  const state = { ...((persistedState ?? {}) as Record<string, unknown>) };

  // v6 -> v7: the default is now "no source selected" — clear the previously
  // pre-selected playlist so existing installs also land on the empty default.
  if (version !== undefined && version < 7) {
    const prev = (state.source ?? {}) as Record<string, unknown>;
    state.source = { ...prev, playlist: '' };
  }

  const src = (state.source ?? {}) as Record<string, unknown>;
  state.source = {
    playlist: typeof src.playlist === 'string' ? src.playlist : DEFAULT_SOURCE.playlist,
    epg: typeof src.epg === 'string' ? src.epg : DEFAULT_SOURCE.epg,
    backend: typeof src.backend === 'string' ? src.backend : DEFAULT_SOURCE.backend,
  };
  state.volume =
    typeof state.volume === 'number' && !Number.isNaN(state.volume)
      ? Math.min(1, Math.max(0, state.volume))
      : 1;
  state.muted = state.muted === true;
  return state;
};

export default migrate;
