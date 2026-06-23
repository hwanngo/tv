/**
 * EpgTimeline — port of _ui-logic/IPTV Play.dc.html:104-131 (rows) and :445-449 (style strings).
 * Renders each programme row: live rows show animated LIVE dot + equalizer bars + progress bar;
 * non-live rows show the time label only.
 *
 * NOTE: @keyframes `eq` and `lp` are defined globally in Task 16. Referenced inline here —
 * they won't animate until then but cause no errors.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { csx } from '@utils/cssString';
import { hhmm } from '@utils/epg';
import type { TimelineItem } from '@utils/epg';

interface EpgTimelineProps {
  items: TimelineItem[];
  listStyle: string;
}

const EpgTimeline = ({ items, listStyle }: EpgTimelineProps) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const liveKey = items.find((p) => p.isLive)?.start ?? '';

  // Scroll the currently-airing programme into view (near the top) when the
  // channel loads or the live show changes — don't leave the user stuck at the top.
  useEffect(() => {
    const list = listRef.current;
    const live = liveRef.current;
    if (!list || !live) return;
    list.scrollTop += live.getBoundingClientRect().top - list.getBoundingClientRect().top - 8;
  }, [liveKey]);

  return (
  <div ref={listRef} style={csx(listStyle)}>
    {items.map((p) => {
      // .dc:445 row style — live gets highlight background, non-live gets border-bottom
      const rowStyle =
        'display:flex;gap:14px;align-items:flex-start;padding:13px 12px;margin:0 -12px;border-radius:10px;' +
        (p.isLive ? 'background:#1c1c22' : 'border-bottom:1px solid #1b1b20');

      // .dc:446 timeStyle — past text is more muted
      const timeStyle =
        'width:54px;flex:none;font-size:14px;font-weight:500;color:' +
        (p.isPast ? '#5e5e64' : '#9a9a9f');

      // .dc:447 titleStyle — live is bold white, past is dimmed, future is near-white
      const titleStyle =
        'font-size:15px;' +
        (p.isLive
          ? 'font-weight:700;color:#fff'
          : p.isPast
            ? 'color:#7a7a80'
            : 'color:#e6e6e8') +
        ';text-wrap:pretty';

      // .dc:448 barStyle — progress bar fill
      const barStyle =
        'height:100%;width:' + p.progressPct + '%;background:#FE592A;border-radius:9999px';

      return (
        // .dc:107 row div
        <div key={p.start} ref={p.isLive ? liveRef : undefined} style={csx(rowStyle)}>
          {/* .dc:108-110 live: animated dot + LIVE label */}
          {p.isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, width: 54, flexShrink: 0 }}>
              <span
                style={{ width: 7, height: 7, borderRadius: '50%', background: '#FE592A', animation: 'lp 1.4s infinite' }}
              />
              <span style={{ color: '#FE592A', fontSize: 12, fontWeight: 700 }}>{t('iptv.epg.live')}</span>
            </div>
          )}
          {/* .dc:111-113 non-live: time label */}
          {!p.isLive && <div style={csx(timeStyle)}>{p.timeLabel}</div>}
          {/* .dc:114-127 content column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={csx(titleStyle)}>{p.title}</span>
              {/* .dc:117-119 equalizer bars shown only for live row */}
              {p.isLive && (
                <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14, flexShrink: 0 }}>
                  <span style={{ width: 3, background: '#FE592A', borderRadius: 2, height: '60%', animation: 'eq .9s infinite' }} />
                  <span style={{ width: 3, background: '#FE592A', borderRadius: 2, height: '100%', animation: 'eq .9s infinite .2s' }} />
                  <span style={{ width: 3, background: '#FE592A', borderRadius: 2, height: '45%', animation: 'eq .9s infinite .35s' }} />
                  <span style={{ width: 3, background: '#FE592A', borderRadius: 2, height: '80%', animation: 'eq .9s infinite .5s' }} />
                </span>
              )}
            </div>
            {/* the actual programme name (XMLTV <desc>) under the genre title */}
            {p.desc && (
              <div
                style={csx(
                  'font-size:13px;margin-top:3px;text-wrap:pretty;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:' +
                    (p.isLive ? '#cfcfcf' : p.isPast ? '#6a6a70' : '#9a9a9f')
                )}
              >
                {p.desc}
              </div>
            )}
            {/* .dc:121-126 progress bar + start/stop shown only for live row */}
            {p.isLive && (
              <div style={{ marginTop: 9 }}>
                <div style={{ height: 4, borderRadius: 9999, background: '#3a3a42', overflow: 'hidden' }}>
                  <div style={csx(barStyle)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#9a9a9f' }}>
                  {hhmm(p.start)}
                  <span>{hhmm(p.stop)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
  );
};

export default EpgTimeline;
