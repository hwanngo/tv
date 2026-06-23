/**
 * EpgNowNext — port of _ui-logic/IPTV Play.dc.html:133-149.
 * Renders: "ĐANG PHÁT" card (title + progress bar + start/stop times),
 * then "TIẾP THEO" heading + list of upcoming programmes.
 */
import { useTranslation } from 'react-i18next';
import { csx } from '@utils/cssString';
import { hhmm } from '@utils/epg';
import type { TimelineItem } from '@utils/epg';

interface EpgNowNextProps {
  live: TimelineItem | null;
  upcoming: TimelineItem[];
  listStyle: string;
}

// .dc:416 nowCard style
const nowCardStyle =
  'background:linear-gradient(135deg,#241a16,#16161a);border:1px solid #3a2a22;border-radius:12px;padding:16px;margin-bottom:14px';

const EpgNowNext = ({ live, upcoming, listStyle }: EpgNowNextProps) => {
  const { t } = useTranslation();

  // .dc:448 barStyle for progress bar fill
  const barStyle = live
    ? 'height:100%;width:' + live.progressPct + '%;background:#FE592A;border-radius:9999px'
    : 'height:100%;width:0%;background:#FE592A;border-radius:9999px';

  return (
    <div style={csx(listStyle)}>
      {/* .dc:135-140 ĐANG PHÁT card */}
      {live && (
        <div style={csx(nowCardStyle)}>
          {/* .dc:136 label */}
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#FE592A' }}>
            {t('iptv.epg.now')}
          </span>
          {/* .dc:137 title (genre) + actual programme name (XMLTV <desc>) */}
          <div style={{ margin: '6px 0 12px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, textWrap: 'pretty' }}>{live.title}</div>
            {live.desc && (
              <div
                style={{
                  fontSize: 14,
                  color: '#cfcfcf',
                  marginTop: 4,
                  textWrap: 'pretty',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {live.desc}
              </div>
            )}
          </div>
          {/* .dc:138 progress bar */}
          <div style={{ height: 5, borderRadius: 9999, background: '#3a3a42', overflow: 'hidden' }}>
            <div style={csx(barStyle)} />
          </div>
          {/* .dc:139 start/stop (formatted hhmm) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 12, color: '#b5b5ba' }}>
            {hhmm(live.start)}
            <span>{hhmm(live.stop)}</span>
          </div>
        </div>
      )}

      {/* .dc:141 TIẾP THEO heading */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#8a8a90', letterSpacing: '.6px', padding: '4px 2px 2px' }}>
        {t('iptv.epg.next')}
      </div>

      {/* .dc:142-147 upcoming list */}
      {upcoming.map((p) => (
        // .dc:143 row
        <div
          key={p.start}
          style={{ display: 'flex', gap: 14, alignItems: 'baseline', padding: '11px 2px', borderBottom: '1px solid #1d1d22' }}
        >
          {/* .dc:144 time */}
          <div style={{ width: 46, flexShrink: 0, color: '#9a9a9f', fontSize: 14, fontWeight: 500 }}>
            {p.timeLabel}
          </div>
          {/* .dc:145 title (genre) + name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15 }}>{p.title}</div>
            {p.desc && (
              <div
                style={{
                  fontSize: 13,
                  color: '#8a8a90',
                  marginTop: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.desc}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EpgNowNext;
