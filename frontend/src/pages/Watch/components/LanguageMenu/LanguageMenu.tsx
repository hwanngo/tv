import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@components/Icon';

/** Supported UI languages — add an entry here and the dropdown grows with it.
 *  Labels are autonyms (a language is named in its own language), so they're not
 *  translated. `code` must match an i18n `supportedLngs` entry. */
const LANGS = [
  { code: 'vi-VN', label: 'Tiếng Việt', short: 'VI' },
  { code: 'en-US', label: 'English', short: 'EN' },
] as const;

const LanguageMenu = ({ size = 40 }: { size?: number }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 'none' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('iptv.language')}
        className="hbtn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: size,
          padding: '0 10px',
          background: '#1d1d22',
          border: 'none',
          borderRadius: 9999,
          color: '#fff',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        <Icon name="globe" size={16} />
        <span>{current.short}</span>
        <span
          style={{ display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
        >
          <Icon name="chevronDown" size={14} />
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('iptv.language')}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 168,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: '#17171b',
            border: '1px solid #2a2a31',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            zIndex: 60,
          }}
        >
          {LANGS.map((l) => {
            const active = l.code === current.code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    void i18n.changeLanguage(l.code);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    width: '100%',
                    height: 42,
                    padding: '0 12px',
                    background: active ? 'rgba(254,89,42,0.14)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: active ? '#FE592A' : '#e6e6e8',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    textAlign: 'left',
                  }}
                >
                  {l.label}
                  {active && <Icon name="check" size={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LanguageMenu;
