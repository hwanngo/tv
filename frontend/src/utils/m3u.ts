import type { Channel } from '@type/iptv';

const ATTR_RE = /([\w-]+)="([^"]*)"/g;

/** The channel name is whatever follows the first comma OUTSIDE the quoted
 *  attribute values — names may themselves contain commas. */
function extinfName(line: string): string {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ',' && !inQuote) return line.slice(i + 1).trim();
  }
  return '';
}

/** Parse an M3U/M3U8 playlist into channels (slug ids, tvg-* / group-title attrs).
 *  `live` is true for http(s) entries — those play directly; udp/rtp need the bridge. */
export function parseM3U(body: string): Channel[] {
  const out: Channel[] = [];
  const used: Record<string, boolean> = {};
  let cur: Partial<Channel> | null = null;

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF')) {
      cur = { group: 'Khác', logo: '', tvgId: '' };
      let m: RegExpExecArray | null;
      ATTR_RE.lastIndex = 0;
      while ((m = ATTR_RE.exec(line))) {
        if (m[1] === 'tvg-id') cur.tvgId = m[2];
        else if (m[1] === 'group-title') cur.group = m[2] || 'Khác';
        else if (m[1] === 'tvg-logo') cur.logo = m[2];
      }
      cur.name = extinfName(line) || 'Kênh';
    } else if (line && !line.startsWith('#')) {
      if (cur) {
        const base =
          (cur.name || 'ch').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ch';
        let id = base;
        let i = 2;
        while (used[id]) id = `${base}-${i++}`;
        used[id] = true;
        out.push({
          id,
          name: cur.name || 'Kênh',
          group: cur.group || 'Khác',
          logo: cur.logo || '',
          tvgId: cur.tvgId || '',
          url: line,
          featured: false,
          live: /^https?:/.test(line),
        });
        cur = null;
      }
    }
  }
  return out;
}
