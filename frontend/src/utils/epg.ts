import type { Programme } from '@type/iptv';

export interface TimelineItem {
  start: string; stop: string; title: string; desc?: string;
  timeLabel: string; isLive: boolean; isPast: boolean; progressPct: number;
}
export interface EpgView {
  timeline: TimelineItem[];
  liveIndex: number;
  live: TimelineItem | null;
  upcoming: TimelineItem[];
}

const ms = (iso: string): number => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Decode HTML entities (&quot; &amp; &#39; …) the XMLTV feed double-encodes. */
const decodeEntities = (s: string): string => {
  if (!s || !s.includes('&') || typeof document === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
};

export const hhmm = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const progressPct = (start: string, stop: string, now: number): number => {
  const a = ms(start), b = ms(stop);
  if (!(b > a)) return 0;
  return Math.max(2, Math.min(100, ((now - a) / (b - a)) * 100));
};

/** Index of the programme currently airing (last whose start ≤ now). -1 if none. */
const liveIndexOf = (progs: Programme[], now: number): number => {
  let idx = -1;
  for (let i = 0; i < progs.length; i++) if (ms(progs[i].start) <= now) idx = i;
  return idx;
};

/** Transform an XMLTV programme array into the Timeline + Now/Next view model. */
export function buildEpg(progs: Programme[], now: number): EpgView {
  // XMLTV order isn't guaranteed; sort ascending so the live/upcoming slicing is correct.
  const sorted = [...progs].sort((a, b) => ms(a.start) - ms(b.start));
  const li = liveIndexOf(sorted, now);
  const timeline: TimelineItem[] = sorted.map((p, i) => {
    const isLive = i === li && ms(p.stop) > now;
    return {
      start: p.start, stop: p.stop,
      title: decodeEntities(p.title), desc: p.desc ? decodeEntities(p.desc) : p.desc,
      timeLabel: hhmm(p.start),
      isLive,
      isPast: i < li,
      progressPct: isLive ? progressPct(p.start, p.stop, now) : 0,
    };
  });
  return {
    timeline,
    liveIndex: li,
    live: li >= 0 ? timeline[li] : null,
    upcoming: li >= 0 ? timeline.slice(li + 1, li + 8) : timeline.slice(0, 7),
  };
}
