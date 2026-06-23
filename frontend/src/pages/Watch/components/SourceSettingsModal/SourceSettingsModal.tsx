/**
 * SourceSettingsModal — faithful port of _ui-logic/IPTV Play.dc.html:202-232 (markup)
 * and :473-503 (preset + draft + apply logic).
 *
 * Uses the bespoke modal styles from makeStyles (modal/modalScrim/field/statusStyle)
 * rather than @components/Dialog, because watchStyles already encodes the bottom-sheet
 * on mobile / centered on desktop transitions and settingsOpen visibility — making this
 * a cleaner faithful port with zero bridging overhead.
 *
 * Props: { open, onClose }
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { csx } from '@utils/cssString';
import { makeStyles } from '@pages/Watch/watchStyles';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { useFocusTrap } from '@hooks/useFocusTrap';
import { isHttpUrl } from '@utils/resolveSrc';
import type { Source } from '@type/iptv';
import useStore from '@store/store';
import Icon from '@components/Icon';
import SourceSelect from '@pages/Watch/components/SourceSelect';

export interface SourceSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SourceSettingsModal = ({ open, onClose }: SourceSettingsModalProps) => {
  const { t } = useTranslation();
  const bp = useBreakpoint();

  const source = useStore((s) => s.source);
  const setSource = useStore((s) => s.setSource);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, onClose);

  // .dc:473 – draft state seeded from store source whenever modal opens
  const [draft, setDraft] = useState<Source>({ ...source });

  useEffect(() => {
    if (open) setDraft({ ...source });
  }, [open, source]);

  // statusStyle: a non-http (udp) source with no bridge configured → needBridge hint
  const status =
    !isHttpUrl(draft.playlist) && !draft.backend ? t('iptv.settings.needBridge') : '';

  const s = makeStyles({ bp, drawerOpen: false, settingsOpen: open, status });

  // .dc:497 – apply: setSource(draft) then close
  const handleApply = () => {
    setSource(draft);
    onClose();
  };

  return (
    <>
      {/* .dc:202 scrim */}
      <div onClick={onClose} style={csx(s.modalScrim)} inert={!open} />

      {/* .dc:203 modal panel — inert when closed so its controls leave the tab order / AT */}
      <div
        ref={panelRef}
        style={csx(s.modal)}
        role="dialog"
        aria-modal="true"
        aria-label={t('iptv.settings.title')}
        aria-hidden={!open}
        inert={!open}
      >
        {/* .dc:204-207 header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '19px' }}>{t('iptv.settings.title')}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '-8px -8px -8px 0', color: '#fff' }}
            aria-label={t('iptv.settings.close')}
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* .dc:208 desc */}
        <div style={{ fontSize: '13px', color: '#9a9a9f', lineHeight: 1.5 }}>
          {t('iptv.settings.desc')}
        </div>

        {/* source selector — quick-pick presets + every iptv-org country (searchable) */}
        <div
          style={{
            marginTop: '18px',
            marginBottom: '9px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#8a8a90',
            letterSpacing: '.5px',
          }}
        >
          {t('iptv.settings.sourceLabel')}
        </div>
        <SourceSelect value={draft} onSelect={(patch) => setDraft((d) => ({ ...d, ...patch }))} />

        {/* .dc:217-220 playlist field */}
        <div style={{ marginTop: '18px', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
          {t('iptv.settings.playlist')}
        </div>
        <input
          value={draft.playlist}
          aria-label={t('iptv.settings.playlist')}
          onChange={(e) => setDraft((d) => ({ ...d, playlist: e.target.value }))}
          placeholder="https://…/playlist.m3u"
          style={csx(s.field)}
        />

        {/* .dc:222-225 epg field */}
        <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
          {t('iptv.settings.epg')}{' '}
          <span style={{ color: '#9a9a9f' }}>{t('iptv.settings.epgOptional')}</span>
        </div>
        <input
          value={draft.epg}
          aria-label={t('iptv.settings.epg')}
          onChange={(e) => setDraft((d) => ({ ...d, epg: e.target.value }))}
          placeholder="https://…/epg.xml"
          style={csx(s.field)}
        />

        {/* .dc:227-230 backend field */}
        <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
          {t('iptv.settings.backend')}{' '}
          <span style={{ color: '#9a9a9f' }}>{t('iptv.settings.backendHint')}</span>
        </div>
        <input
          value={draft.backend}
          aria-label={t('iptv.settings.backend')}
          onChange={(e) => setDraft((d) => ({ ...d, backend: e.target.value }))}
          placeholder="http://localhost:8080"
          style={csx(s.field)}
        />

        {/* .dc:424 status line */}
        <div role="status" aria-live="polite" style={csx(s.statusStyle)}>{status}</div>

        {/* .dc:231-234 action buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '18px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: '44px',
              padding: '0 20px',
              border: '1px solid #33333a',
              borderRadius: '9999px',
              background: 'transparent',
              color: '#fff',
              fontFamily: 'inherit',
              fontWeight: 500,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            {t('iptv.settings.cancel')}
          </button>
          <button
            onClick={handleApply}
            style={{
              height: '44px',
              padding: '0 24px',
              border: 'none',
              borderRadius: '9999px',
              background: 'var(--accent-strong)',
              color: '#fff',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            {t('iptv.settings.apply')}
          </button>
        </div>
      </div>
    </>
  );
};

export default SourceSettingsModal;
