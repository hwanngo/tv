import { describe, expect, it } from 'vitest';
import { parseM3U } from '@utils/m3u';

const SAMPLE = `#EXTM3U
#EXTINF:-1 tvg-id="ch1" tvg-logo="http://logo/ch1.png" group-title="News",Channel One HD
https://example.com/ch1/index.m3u8
#EXTINF:-1 group-title="News",Channel One HD
udp://@225.1.2.3:30120
#EXTINF:-1,No Group Channel
https://example.com/x.m3u8`;

describe('parseM3U', () => {
  it('parses name, group, logo, tvg-id and the stream url', () => {
    const ch = parseM3U(SAMPLE);
    expect(ch[0]).toMatchObject({
      name: 'Channel One HD', group: 'News', tvgId: 'ch1',
      logo: 'http://logo/ch1.png', url: 'https://example.com/ch1/index.m3u8',
    });
  });

  it('marks http(s) entries live and dedups slug ids', () => {
    const ch = parseM3U(SAMPLE);
    expect(ch[0].id).toBe('channel-one-hd');
    expect(ch[1].id).toBe('channel-one-hd-2'); // duplicate name → suffixed
    expect(ch[0].live).toBe(true);
    expect(ch[1].live).toBe(false); // udp:// is not directly playable
  });

  it('defaults a missing group to "Khác"', () => {
    const ch = parseM3U(SAMPLE);
    expect(ch[2].group).toBe('Khác');
  });
});
