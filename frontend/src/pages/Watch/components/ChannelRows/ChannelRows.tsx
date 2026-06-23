/**
 * ChannelRows — port of _ui-logic/IPTV Play.dc.html:155-174 (+ .dc:459-465 wiring).
 *
 * Renders a group tab bar (Featured + one per distinct group) with orange bottom-border
 * active style, and a horizontally-scrolling row of ChannelCard variant="row" (width 236).
 *
 * Tab pools (.dc:463-464):
 *   __feat → channels where featured || live
 *   <group> → channels where group === tab
 *   if empty → all channels
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChannelCard from '@pages/Watch/components/ChannelCard';
import type { Channel } from '@type/iptv';

export interface ChannelRowsProps {
  channels: Channel[];
  onSelect: (id: string) => void;
  colors: Record<string, string>;
}

const FEAT_TAB = '__feat';

const ChannelRows = ({ channels, onSelect, colors }: ChannelRowsProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(FEAT_TAB);

  // .dc:459 – distinct groups in order
  const groups = [...new Set(channels.map((c) => c.group))];

  // .dc:460 – tab defs: Featured + one per group
  const tabDefs: [string, string][] = [
    [FEAT_TAB, t('iptv.rows.featured')],
    ...groups.map<[string, string]>((g) => [g, g]),
  ];

  // .dc:463-464 – pool logic
  let pool =
    activeTab === FEAT_TAB
      ? channels.filter((c) => c.featured || c.live)
      : channels.filter((c) => c.group === activeTab);
  if (!pool.length) pool = channels;

  const rowCards = pool.slice(0, 14);

  return (
    <section>
      {/* .dc:156-161 – tab bar with search icon prefix and orange active underline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          borderBottom: '1px solid #23232a',
          marginBottom: 18,
          overflowX: 'auto',
        }}
      >
        {/* .dc:158-160 – row tabs */}
        {tabDefs.map(([key, label]) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              aria-pressed={isActive}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                font: 'inherit',
                flexShrink: 0,
                padding: '13px 8px',
                fontSize: 16,
                cursor: 'pointer',
                // .dc:462 – active: orange bottom border; inactive: transparent
                borderBottom: `3px solid ${isActive ? '#FE592A' : 'transparent'}`,
                color: isActive ? '#fff' : '#9a9a9f',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* .dc:162-173 – horizontal scroll row of cards */}
      <div
        style={{
          display: 'flex',
          gap: 18,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {rowCards.map((c) => (
          <ChannelCard
            key={c.id}
            channel={c}
            now={c.group}
            variant="row"
            onSelect={onSelect}
            colors={colors}
          />
        ))}
      </div>
    </section>
  );
};

export default ChannelRows;
