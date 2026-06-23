import { describe, expect, it } from 'vitest';
import { buildEpg, progressPct } from '@utils/epg';
import type { Programme } from '@type/iptv';

const P: Programme[] = [
  { start: '2026-06-22T08:00:00+07:00', stop: '2026-06-22T09:00:00+07:00', title: 'A' },
  { start: '2026-06-22T09:00:00+07:00', stop: '2026-06-22T10:00:00+07:00', title: 'B' },
  { start: '2026-06-22T10:00:00+07:00', stop: '2026-06-22T11:00:00+07:00', title: 'C' },
];
const at = (iso: string) => new Date(iso).getTime();

describe('buildEpg', () => {
  it('marks the airing programme live with a progress %', () => {
    const v = buildEpg(P, at('2026-06-22T09:30:00+07:00'));
    expect(v.liveIndex).toBe(1);
    expect(v.live?.title).toBe('B');
    expect(v.live?.isLive).toBe(true);
    expect(Math.round(v.live!.progressPct)).toBe(50);
    expect(v.timeline[0].isPast).toBe(true);
  });
  it('lists upcoming programmes after the live one', () => {
    const v = buildEpg(P, at('2026-06-22T09:30:00+07:00'));
    expect(v.upcoming.map((u) => u.title)).toEqual(['C']);
  });
});

describe('progressPct', () => {
  it('clamps to [2,100]', () => {
    expect(progressPct(P[0].start, P[0].stop, at('2026-06-22T07:00:00+07:00'))).toBe(2);
    expect(progressPct(P[0].start, P[0].stop, at('2026-06-22T12:00:00+07:00'))).toBe(100);
  });
});
