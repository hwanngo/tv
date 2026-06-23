import { useTranslation } from 'react-i18next';
import { csx } from '@utils/cssString';
import { groupThumb } from '@src/pages/Watch/watchStyles';
import type { Channel } from '@type/iptv';

export interface ChannelCardProps {
  channel: Channel;
  now: string;
  variant?: 'suggest' | 'row';
  onSelect: (id: string) => void;
  colors: Record<string, string>;
}

/**
 * Thumb card used in the suggested grid (.dc:75-83) and bottom channel rows (.dc:163-172).
 * Variant 'suggest' → 64×40 logo, LIVE badge top-left, no fixed container width.
 * Variant 'row'     → 96×54 logo, LIVE badge bottom-left, container flex:none;width:236px.
 */
const ChannelCard = ({ channel, now, variant = 'row', onSelect, colors }: ChannelCardProps) => {
  const { t } = useTranslation();
  const isSuggest = variant === 'suggest';

  // .dc:431-432 thumb background via groupThumb
  const thumbStyle = groupThumb(channel.group, colors);

  // LIVE badge positioning differs per variant
  const liveBadgeStyle = isSuggest
    ? { position: 'absolute' as const, top: 7, left: 7, background: 'var(--accent-strong)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }
    : { position: 'absolute' as const, bottom: 8, left: 8, background: 'var(--accent-strong)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5 };

  // Render as a real <button> (keyboard + screen-reader accessible) — reset the
  // native button chrome but keep the .dc layout (row: flex:none;width:236px;
  // suggest: fills its grid cell).
  const buttonReset = {
    appearance: 'none' as const,
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    font: 'inherit',
    color: 'inherit',
    textAlign: 'left' as const,
    display: 'block',
    cursor: 'pointer',
  };
  const outerStyle = isSuggest
    ? { ...buttonReset, width: '100%' }
    : { ...buttonReset, flexShrink: 0, width: 236 };

  // .dc:81-82 suggest text / .dc:169-170 row text
  const nameStyle = isSuggest
    ? { fontSize: 13, fontWeight: 500, marginTop: 6, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }
    : { fontSize: 15, fontWeight: 500, marginTop: 9, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' };

  const nowStyle = isSuggest
    ? { fontSize: 12, color: '#9a9a9f', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }
    : { fontSize: 13, color: '#9a9a9f', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' };

  return (
    <button type="button" onClick={() => onSelect(channel.id)} style={outerStyle}>
      {/* thumb wrapper: .dc:77 / .dc:165 */}
      <div style={csx(thumbStyle)}>
        {/* logo image — rendered as <img> (not a CSS url(), which would let a
            crafted tvg-logo inject CSS); hidden if the src is missing/broken */}
        {channel.logo && (
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
            style={{
              width: isSuggest ? 64 : 96,
              height: isSuggest ? 40 : 54,
              objectFit: 'contain',
              filter: isSuggest
                ? 'drop-shadow(0 2px 4px rgba(0,0,0,.4))'
                : 'drop-shadow(0 2px 5px rgba(0,0,0,.45))',
            }}
          />
        )}
        {/* LIVE badge: .dc:79 / .dc:167 */}
        {channel.live && <span style={liveBadgeStyle}>{t('iptv.epg.live')}</span>}
      </div>
      {/* name: .dc:81 / .dc:169 */}
      <div style={nameStyle}>{channel.name}</div>
      {/* now-playing: .dc:82 / .dc:170 */}
      <div style={nowStyle}>{now}</div>
    </button>
  );
};

export default ChannelCard;
