import { describe, expect, it } from 'vitest';
import { resolvePlayback, isHlsUrl } from '@utils/resolveSrc';
import type { Channel, Source } from '@type/iptv';

const ch = (over: Partial<Channel>): Channel => ({ id: 'c1', name: 'C1', group: 'G', logo: '', tvgId: '', ...over });
const src = (over: Partial<Source>): Source => ({ playlist: '', epg: '', backend: '', ...over });

describe('resolvePlayback', () => {
  it('returns direct for http(s) channels', () => {
    expect(resolvePlayback(ch({ url: 'https://x/index.m3u8' }), src({}))).toEqual({ kind: 'direct', url: 'https://x/index.m3u8' });
  });
  it('routes a direct http channel through the bridge proxy when a backend is set', () => {
    expect(resolvePlayback(ch({ url: 'https://x/live.m3u8' }), src({ backend: 'http://localhost:8080' }))).toEqual({
      kind: 'direct',
      url: 'http://localhost:8080/proxy?url=' + encodeURIComponent('https://x/live.m3u8'),
    });
  });
  it('returns bridge (Go HLS) for a udp channel + backend (strips trailing slash)', () => {
    expect(resolvePlayback(ch({ id: 'ch1', url: 'udp://@225.1.2.3:30120' }), src({ backend: 'http://localhost:8080/' })))
      .toEqual({ kind: 'bridge', url: 'http://localhost:8080/hls/ch1/index.m3u8' });
  });
  it('returns needsBridge for a udp channel with no gateway', () => {
    expect(resolvePlayback(ch({ url: 'udp://@225.1.2.3:30120' }), src({}))).toEqual({ kind: 'needsBridge' });
  });
});

describe('isHlsUrl', () => {
  it('detects .m3u8', () => {
    expect(isHlsUrl('https://x/a.m3u8')).toBe(true);
    expect(isHlsUrl('https://x/a.m3u8?token=1')).toBe(true);
    expect(isHlsUrl('https://x/a.mp4')).toBe(false);
  });
});
