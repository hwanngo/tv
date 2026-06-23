/**
 * AppHeader — faithful port of _ui-logic/IPTV Play.dc.html:27-47.
 *
 * Left side: hamburger (shown < desktop via s.hamb), orange play-disc logo +
 * brand name, nav with Live TV (active) and Channels (→ onToggleDrawer).
 * Right side: search + cast icon buttons, Source button (→ onOpenSettings),
 * and sign-in label (static).
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { csx } from '@utils/cssString';
import { makeStyles } from '@pages/Watch/watchStyles';
import { useBreakpoint } from '@hooks/useBreakpoint';
import Icon from '@components/Icon';
import LanguageMenu from '@pages/Watch/components/LanguageMenu';

export interface AppHeaderProps {
  onToggleDrawer: () => void;
  onOpenSettings: () => void;
}

const AppHeader = ({ onToggleDrawer, onOpenSettings }: AppHeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const s = makeStyles({ bp, drawerOpen: false, settingsOpen: false, status: '' });
  const mob = bp === 'mobile';
  const ctrl = 44; // 44px minimum touch target (a11y) at every breakpoint

  return (
    <header style={csx(s.header)}>
      {/* Left group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: mob ? '12px' : '22px', minWidth: 0 }}>
        {/* .dc:29 hamburger — hidden on desktop via s.hamb */}
        <button onClick={onToggleDrawer} aria-label={t('nav.openMenu')} className="hbtn" style={csx(s.hamb)}>
          <Icon name="menu" size={22} />
        </button>

        {/* .dc:33 orange play-disc logo + brand → home */}
        <button
          type="button"
          onClick={() => void navigate({ to: '/', search: {} })}
          aria-label={t('iptv.brand')}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: mob ? '8px' : '9px',
            minWidth: ctrl,
            minHeight: ctrl,
          }}
        >
          <span
            style={{
              width: mob ? 26 : 30,
              height: mob ? 26 : 30,
              borderRadius: '50%',
              background: '#FE592A',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flex: 'none',
            }}
          >
            <Icon name="play" size={mob ? 12 : 13} />
          </span>
          <span
            className="hidden min-[375px]:inline"
            style={{ fontWeight: 700, fontSize: mob ? '18px' : '21px', letterSpacing: '-.2px', whiteSpace: 'nowrap', color: '#fff' }}
          >
            {t('iptv.brand')}
          </span>
        </button>

        {/* .dc:36-39 nav — hidden on mobile/tabletP via s.nav */}
        <nav style={csx(s.nav)}>
          {/* channels nav item → opens drawer */}
          <button
            type="button"
            onClick={onToggleDrawer}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              font: 'inherit',
              padding: 0,
              color: '#cfcfcf',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <Icon name="list" size={16} />
            {t('iptv.nav.channels')}
          </button>
        </nav>
      </div>

      {/* Right group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: mob ? '8px' : '14px' }}>
        {/* .dc:41 search → opens the channel drawer (which holds the search field) */}
        <button onClick={onToggleDrawer} className="hbtn" style={csx(s.icon)} aria-label={t('iptv.search')}>
          <Icon name="search" size={21} />
        </button>

        {/* .dc:43 source button (gear only) → onOpenSettings */}
        <button onClick={onOpenSettings} aria-label={t('iptv.source')} title={t('iptv.source')} className="hbtn" style={csx(s.icon)}>
          <Icon name="settings" size={20} />
        </button>

        {/* language dropdown (scales to more languages) */}
        <LanguageMenu size={ctrl} />
      </div>
    </header>
  );
};

export default AppHeader;
