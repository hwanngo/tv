import { describe, it, expect } from 'vitest';
import migrate from './migrate';
import { DEFAULT_SOURCE } from '@constants/iptv';

describe('store migrate', () => {
  it('fills a missing source with the default', () => {
    const out = migrate({}) as Record<string, unknown>;
    expect(out.source).toEqual(DEFAULT_SOURCE);
  });

  it('keeps valid persisted source fields', () => {
    const out = migrate({ source: { playlist: 'p', epg: 'e', backend: 'b' } }) as Record<string, unknown>;
    expect(out.source).toEqual({ playlist: 'p', epg: 'e', backend: 'b' });
  });

  it('v6 -> v7 clears the pre-selected playlist but keeps the backend', () => {
    const out = migrate({ source: { playlist: 'https://x/vn.m3u', epg: 'e', backend: '/bridge' } }, 6) as Record<string, unknown>;
    const src = out.source as { playlist: string; backend: string };
    expect(src.playlist).toBe('');
    expect(src.backend).toBe('/bridge');
  });

  it('drops a stale gateway field from the persisted source', () => {
    const out = migrate({
      source: { playlist: 'p', epg: 'e', backend: 'b', gateway: 'g' },
    }) as Record<string, unknown>;
    expect(out.source).toEqual({ playlist: 'p', epg: 'e', backend: 'b' });
  });

  it('clamps volume and coerces muted to safe values', () => {
    expect((migrate({ volume: 2, muted: true }) as Record<string, unknown>).volume).toBe(1);
    expect((migrate({ volume: NaN, muted: 'yes' }) as Record<string, unknown>).volume).toBe(1);
    expect((migrate({ muted: 'yes' }) as Record<string, unknown>).muted).toBe(false);
  });
});
