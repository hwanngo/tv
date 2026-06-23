/**
 * SuggestedGrid — port of _ui-logic/IPTV Play.dc.html:71-86 (+ .dc:456 wiring).
 *
 * Renders a 2-column grid of ChannelCard variant="suggest" for channels OTHER
 * than the current one, first 6 results. Card subtitle = channel.group (.dc:456 uses
 * `now` which in Option A resolves to the group string per ambiguity resolution).
 */
import { useTranslation } from 'react-i18next';
import ChannelCard from '@pages/Watch/components/ChannelCard';
import type { Channel } from '@type/iptv';

export interface SuggestedGridProps {
  channels: Channel[];
  current: Channel;
  onSelect: (id: string) => void;
  colors: Record<string, string>;
}

const SuggestedGrid = ({ channels, current, onSelect, colors }: SuggestedGridProps) => {
  const { t } = useTranslation();

  // .dc:456 – filter out current channel, take first 6
  const suggestCards = channels.filter((c) => c.id !== current.id).slice(0, 6);

  return (
    <div style={{ background: '#141417', border: '1px solid #23232a', borderRadius: 12, overflow: 'hidden' }}>
      {/* .dc:73 – "Kênh gợi ý" header */}
      <div style={{ padding: '16px 16px 4px', fontWeight: 700, fontSize: 17 }}>
        {t('iptv.tabs.suggested')}
      </div>
      {/* .dc:74 – suggestGrid: 2-col grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px 14px',
          padding: '12px 16px 18px',
        }}
      >
        {suggestCards.map((c) => (
          <ChannelCard
            key={c.id}
            channel={c}
            now={c.group}
            variant="suggest"
            onSelect={onSelect}
            colors={colors}
          />
        ))}
      </div>
    </div>
  );
};

export default SuggestedGrid;
