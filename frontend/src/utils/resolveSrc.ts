import type { Channel, Source } from '@type/iptv';

export const isHlsUrl = (url: string): boolean => /\.m3u8(\?|$)/i.test(url);
export const isHttpUrl = (url?: string): url is string => !!url && /^https?:/i.test(url);

export type Playback =
  | { kind: 'direct'; url: string } // http(s) channel — hls.js / native
  | { kind: 'bridge'; url: string } // Go bridge HLS — hls.js, deep-buffered = smooth
  | { kind: 'needsBridge' };

/** http(s) → play directly; non-http + a configured Go bridge → play the bridge's
 *  HLS (deep-buffered for smooth live, ~8s behind the edge); else can't play. */
export function resolvePlayback(channel: Channel, source: Source): Playback {
  const backend = (source.backend || '').replace(/\/$/, '');
  if (isHttpUrl(channel.url)) {
    // Route direct streams through the bridge's CORS proxy when one is configured,
    // so CORS-restricted streams play in browsers without native HLS (Chrome/Firefox).
    if (backend) return { kind: 'direct', url: `${backend}/proxy?url=${encodeURIComponent(channel.url)}` };
    return { kind: 'direct', url: channel.url };
  }
  if (backend) return { kind: 'bridge', url: `${backend}/hls/${channel.id}/index.m3u8` };
  return { kind: 'needsBridge' };
}
