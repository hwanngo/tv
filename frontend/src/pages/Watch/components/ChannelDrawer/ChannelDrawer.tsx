/**
 * ChannelDrawer — port of _ui-logic/IPTV Play.dc.html:177-200 (+ .dc:467-471 wiring).
 *
 * Uses @components/Drawer with side="left" and title from t('iptv.drawer.title').
 * The Drawer component provides: backdrop, left panel, header with title+close button,
 * and a scrollable children area (class p-6). We compensate for the p-6 padding by
 * wrapping children in a -mx-6 -mt-6 div so the search bar and list sit flush to
 * the Drawer panel edges, matching the .dc layout (padding:0 16px 12px for search,
 * 0 8px 24px for the grouped list).
 *
 * Drawer width prop is set to "360px" to match .dc:420 (width: desktop 360px).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Drawer from '@components/Drawer';
import ChannelTile from '@pages/Watch/components/ChannelTile';
import type { Channel } from '@type/iptv';

export interface ChannelDrawerProps {
  open: boolean;
  onClose: () => void;
  channels: Channel[];
  current: Channel;
  onSelect: (id: string) => void;
}

const ChannelDrawer = ({ open, onClose, channels, current, onSelect }: ChannelDrawerProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the search field when the drawer opens — it's the channel-search entry
  // point (the header search icon opens this drawer).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  // .dc:468 – filter channels by search query (case-insensitive name match)
  const q = search.trim().toLowerCase();
  const filtered = channels.filter((c) => !q || c.name.toLowerCase().includes(q));

  // .dc:459 – distinct groups (maintain insertion order)
  const groups = [...new Set(channels.map((c) => c.group))];

  // .dc:470 – drawerGroups: group label + filtered items, skip empty groups
  const drawerGroups = groups
    .map((g) => ({
      group: g,
      items: filtered.filter((c) => c.group === g),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      title={t('iptv.drawer.title')}
      ariaLabel={t('iptv.drawer.title')}
      closeLabel={t('iptv.settings.close')}
      width="360px"
    >
      {/*
        Drawer applies p-6 to the children wrapper. Use -mx-6 -mt-6 to negate
        horizontal/top padding so the search bar and list sit at the panel edges,
        matching .dc:182-188 (padding:0 16px 12px on the search section).
      */}
      <div style={{ margin: '-24px -24px 0', paddingTop: 16 }}>
        {/* .dc:182-187 – search input bar */}
        <div style={{ padding: '0 16px 12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: '#1d1d22',
              border: '1px solid #2c2c33',
              borderRadius: 9999,
              padding: '9px 15px',
            }}
          >
            {/* .dc:184 – search icon */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a9a9f" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            {/* .dc:185 – search input */}
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('iptv.drawer.search')}
              aria-label={t('iptv.drawer.search')}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 15,
              }}
            />
          </div>
        </div>

        {/* .dc:188-199 – grouped channel list */}
        <div style={{ overflowY: 'auto', padding: '0 8px 24px' }}>
          {drawerGroups.map((g) => (
            <div key={g.group}>
              {/* .dc:190 – group label */}
              <div
                style={{
                  padding: '14px 8px 7px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#8a8a90',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                }}
              >
                {g.group}
              </div>

              {/* .dc:191-197 – channel rows within group */}
              {g.items.map((c) => {
                const isCurrent = c.id === current.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    data-testid={`channel-row-${c.id}`}
                    onClick={() => onSelect(c.id)}
                    aria-current={isCurrent ? 'true' : undefined}
                    style={{
                      appearance: 'none',
                      border: 'none',
                      font: 'inherit',
                      color: 'inherit',
                      textAlign: 'left',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 8px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      // .dc:471 – highlight current channel row
                      background: isCurrent ? '#1c1c22' : 'transparent',
                    }}
                  >
                    {/* .dc:193 – channel logo tile (dark, initial-letter fallback) */}
                    <ChannelTile logo={c.logo} name={c.name} size={40} radius="9px" />

                    {/* .dc:194 – channel name + now (group as subtitle per Option A) */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#9a9a9f',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.group}
                      </div>
                    </div>

                    {/* .dc:195 – LIVE badge */}
                    {c.live && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#FE592A',
                          flexShrink: 0,
                        }}
                      >
                        {`● ${t('iptv.epg.live')}`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
};

export default ChannelDrawer;
