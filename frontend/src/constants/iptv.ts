import type { Channel, Source } from '@type/iptv';

export const DEFAULT_SOURCE: Source = {
  // No source selected by default — the user picks a country in Source settings.
  playlist: '',
  epg: '',
  // Same-origin bridge: nginx (prod) / Vite (dev) proxy /bridge -> the backend,
  // so direct streams play via its CORS proxy and udp:// channels via its HLS out.
  backend: '/bridge',
};

/** iptv-org per-country playlist URL (lowercase ISO 3166-1 alpha-2 code). */
export const countryPlaylistUrl = (code: string): string =>
  `https://iptv-org.github.io/iptv/countries/${code.toLowerCase()}.m3u`;

/** Optional per-group accent colours, keyed by group label. Empty by default:
 *  groups without an entry get a deterministic colour hashed from their name
 *  (see `groupThumb` in watchStyles), so no channel/group identifiers are baked in. */
export const GROUP_COLORS: Record<string, string> = {};

/** Channels shown before a source is configured. Empty by default — channels come
 *  from the configured source (a country list, or the bridge's own playlist). */
export const FALLBACK_CHANNELS: Channel[] = [];
