/**
 * SourceSelect — searchable source picker for the settings modal. Lists the
 * quick-pick presets plus every iptv-org country (flag + name), filterable as
 * you type. Choosing an option patches the draft Source (playlist/epg/backend).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@components/Icon';
import { useCountries } from '@hooks/useCountries';
import { countryPlaylistUrl } from '@constants/iptv';
import type { Source } from '@type/iptv';

interface Option {
  id: string;
  label: string;
  flag?: string;
  patch: Partial<Source>;
}

export interface SourceSelectProps {
  value: Source;
  onSelect: (patch: Partial<Source>) => void;
}

const emptyStyle: React.CSSProperties = {
  padding: '16px 12px',
  color: '#9a9a9f',
  fontSize: 13,
  textAlign: 'center',
};

/** Flag emoji from a 2-letter ISO country code (regional-indicator letters). */
const flagFromCode = (code: string): string =>
  code.toUpperCase().replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));

const SourceSelect = ({ value, onSelect }: SourceSelectProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // A selected country needs the list (for its flag + name) even when the dropdown
  // is closed, so fetch when a country code is present in the playlist URL.
  const countryCode = value.playlist.match(/\/countries\/([a-z]{2})\.m3u$/i)?.[1];
  const { countries, isLoading, error } = useCountries(open || !!countryCode);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const options = useMemo<Option[]>(
    () =>
      countries.map((c) => ({
        id: `country:${c.code}`,
        label: c.name,
        flag: c.flag,
        // Keep the user's backend: when set, country streams play via the CORS proxy.
        patch: { playlist: countryPlaylistUrl(c.code), epg: '' },
      })),
    [countries]
  );

  const current = useMemo(
    () => options.find((o) => o.patch.playlist === value.playlist),
    [options, value.playlist]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  // Open behaviour: focus the search box, close on Escape / outside click.
  useEffect(() => {
    if (!open) return;
    setQuery(''); // reset the filter each open so a stale query can't strand on "no matches"
    searchRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (o: Option) => {
    onSelect(o.patch);
    setOpen(false);
    setQuery('');
  };

  // Trigger label: matched option → preset/country (flag + name); a country URL
  // still loading → derived flag + code; other non-empty URL → "Custom"; empty →
  // "Choose a source".
  const triggerLabel = current
    ? `${current.flag ? current.flag + '  ' : ''}${current.label}`
    : countryCode
      ? `${flagFromCode(countryCode)}  ${countryCode.toUpperCase()}`
      : value.playlist
        ? t('iptv.settings.customSource')
        : t('iptv.settings.chooseSource');

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          height: 44,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: '#1c1c21',
          border: '1px solid #2f2f37',
          borderRadius: 10,
          color: '#fff',
          fontFamily: 'inherit',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {triggerLabel}
        </span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 20,
            background: '#141417',
            border: '1px solid #2c2c33',
            borderRadius: 12,
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 12px 32px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderBottom: '1px solid #23232a',
              color: '#9a9a9f',
            }}
          >
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('iptv.settings.searchSource')}
              aria-label={t('iptv.settings.searchSource')}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 14,
              }}
            />
          </div>

          <div role="listbox" style={{ maxHeight: 280, overflowY: 'auto', padding: 6 }}>
            {error ? (
              <div style={emptyStyle}>{t('iptv.settings.sourceLoadError')}</div>
            ) : isLoading ? (
              <div style={emptyStyle}>{t('iptv.settings.loadingCountries')}</div>
            ) : filtered.length ? (
              filtered.map((o) => {
                const sel = o.id === current?.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    onClick={() => choose(o)}
                    onMouseEnter={(e) => {
                      if (!sel) e.currentTarget.style.background = '#1d1d22';
                    }}
                    onMouseLeave={(e) => {
                      if (!sel) e.currentTarget.style.background = 'transparent';
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      minHeight: 44,
                      borderRadius: 8,
                      border: 'none',
                      background: sel ? 'rgba(254, 89, 42, 0.14)' : 'transparent',
                      color: sel ? '#fff' : '#d5d5d8',
                      font: 'inherit',
                      fontSize: 14,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {o.flag && (
                      <span style={{ fontSize: 18, lineHeight: 1, flex: 'none' }}>{o.flag}</span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.label}
                    </span>
                    {sel && (
                      <span style={{ marginLeft: 'auto', flex: 'none', display: 'inline-flex' }}>
                        <Icon name="check" size={16} />
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div style={emptyStyle}>{t('iptv.settings.noResults')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceSelect;
