/**
 * Watch — the full IPTV Play screen. Faithful assembly of the render tree in
 * _ui-logic/IPTV Play.dc.html:25-233 wired with the `renderVals` derivations
 * (:434-504), using the already-built Watch components.
 *
 * Layout: AppHeader / main(leftCol: player + meta + share | aside: Suggested|Schedule
 * tabs) / ChannelRows (desktop-only) / ChannelDrawer / SourceSettingsModal.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { csx } from '@utils/cssString';
import { makeStyles, tabStyle } from '@src/pages/Watch/watchStyles';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { useChannels } from '@hooks/useChannels';
import { resolvePlayback } from '@utils/resolveSrc';
import { GROUP_COLORS } from '@constants/iptv';
import useStore from '@store/store';
import Icon from '@components/Icon';
import Spinner from '@components/Spinner';
import AppHeader from '@pages/Watch/components/AppHeader';
import VideoPlayer from '@pages/Watch/components/VideoPlayer';
import ChannelTile from '@pages/Watch/components/ChannelTile';
import SuggestedGrid from '@pages/Watch/components/SuggestedGrid';
import EpgPanel from '@pages/Watch/components/EpgPanel';
import ChannelRows from '@pages/Watch/components/ChannelRows';
import ChannelDrawer from '@pages/Watch/components/ChannelDrawer';
import SourceSettingsModal from '@pages/Watch/components/SourceSettingsModal';

const Watch = () => {
  const { t, i18n } = useTranslation();
  const bp = useBreakpoint();
  const navigate = useNavigate();
  const { ch: chParam } = useSearch({ from: '/' });

  const { channels, isLoading, error } = useChannels();
  const source = useStore((s) => s.source);
  const setLastChannelId = useStore((s) => s.setLastChannelId);
  const lastChannelId = useStore((s) => s.lastChannelId);
  const addToast = useStore((s) => s.addToast);

  // .dc state: view defaults to 'epg'.
  const [view, setView] = useState<'suggest' | 'epg'>('epg');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // curId from ?ch= → lastChannelId → first channel. channels loads async, so guard.
  const [curId, setCurId] = useState<string | undefined>(
    () => chParam ?? lastChannelId ?? undefined
  );

  // Item 3: Track source changes and emit load-feedback toasts.
  // prevSourceRef is undefined until after the initial mount so we skip the first render.
  const prevSourceRef = useRef<typeof source | undefined>(undefined);
  const loadPendingRef = useRef(false);
  const wasLoadingRef = useRef(isLoading);

  useEffect(() => {
    // Skip initial mount (prevSourceRef not set yet).
    if (prevSourceRef.current === undefined) {
      prevSourceRef.current = source;
      return;
    }
    if (prevSourceRef.current !== source) {
      prevSourceRef.current = source;
      loadPendingRef.current = true;
      addToast('warning', t('iptv.settings.loading'));
    }
  }, [source, addToast, t]);

  // Settle toast: fire once per pending load when isLoading transitions to false.
  useEffect(() => {
    const wasLoading = wasLoadingRef.current;
    wasLoadingRef.current = isLoading;

    if (!loadPendingRef.current) return;
    if (wasLoading && !isLoading) {
      loadPendingRef.current = false;
      if (error) {
        const message =
          error.message === 'NO_CHANNELS' ? t('iptv.errors.noChannels') : error.message;
        addToast('error', t('iptv.settings.loadError', { message }));
      } else {
        addToast('success', t('iptv.settings.loaded', { count: channels.length }));
      }
    }
  }, [isLoading, error, channels.length, addToast, t]);

  // If curId isn't in the (possibly newly-loaded) list, fall back to the first channel.
  // Item 4: also sync ?ch= and lastChannelId so the URL is never stale.
  useEffect(() => {
    if (!channels.length) return;
    if (!curId || !channels.some((c) => c.id === curId)) {
      const firstId = channels[0].id;
      setCurId(firstId);
      setLastChannelId(firstId);
      void navigate({ to: '/', search: (prev) => ({ ...prev, ch: firstId }) });
    }
  }, [channels, curId, navigate, setLastChannelId]);

  // Re-sync the playing channel when the URL ?ch= changes (browser back/forward).
  useEffect(() => {
    if (chParam && chParam !== curId && channels.some((c) => c.id === chParam)) {
      setCurId(chParam);
    }
  }, [chParam, channels, curId]);

  const cur = channels.find((c) => c.id === curId) ?? channels[0];

  // Two-column layout (tabletL + desktop): player + meta + carousel on the left,
  // EPG rail on the right.
  const twoCol = bp === 'tabletL' || bp === 'desktop';
  const leftColRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Cap the EPG list to the left column's height so the right rail never
  // overshoots it (no empty gap on either side). The list scrolls internally
  // for the rest of the schedule. Falls back to the viewport calc without RO.
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const left = leftColRef.current;
    if (!twoCol || !left || typeof ResizeObserver === 'undefined') {
      main.style.removeProperty('--epg-max');
      return;
    }
    const ro = new ResizeObserver(() => {
      // subtract the card chrome above the scrolling list (tabs + header + pills)
      const cap = Math.max(280, left.offsetHeight - 188);
      main.style.setProperty('--epg-max', `${cap}px`);
    });
    ro.observe(left);
    return () => ro.disconnect();
  }, [twoCol, cur?.id]);

  const s = makeStyles({ bp, drawerOpen, settingsOpen, status: '' });

  // No channel yet — either still loading, or the source returned none (e.g. a
  // country with no iptv-org playlist). Keep the header + settings modal so the
  // user can pick another source instead of being stranded on a spinner.
  if (!cur) {
    return (
      <div style={csx(s.page)}>
        <AppHeader
          onToggleDrawer={() => setDrawerOpen((o) => !o)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            minHeight: '60vh',
            padding: 24,
            textAlign: 'center',
          }}
        >
          {isLoading ? (
            <>
              <Spinner size="lg" />
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                {t('iptv.player.loading')}
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.8)', maxWidth: 360 }}>
                {t('iptv.player.noChannels')}
              </p>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 9999,
                  border: 'none',
                  background: '#FE592A',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {t('iptv.settings.title')}
              </button>
            </>
          )}
        </div>
        <SourceSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  const playback = resolvePlayback(cur, source);

  const onSelect = (id: string) => {
    setCurId(id);
    setLastChannelId(id);
    void navigate({ to: '/', search: (prev) => ({ ...prev, ch: id }) });
    setDrawerOpen(false);
  };

  // .dc:484 — "Today, dd/mm"
  const dateLabel = `${t('iptv.epg.today')}, ${new Date().toLocaleDateString(i18n.language ?? 'en-GB', {
    day: '2-digit',
    month: '2-digit',
  })}`;

  // Channel carousel (group tabs + horizontal tiles). Rendered inside the left
  // column on two-column layouts; hidden on mobile/tabletP (browse via drawer).
  const channelRows = (
    <ChannelRows channels={channels} onSelect={onSelect} colors={GROUP_COLORS} />
  );

  return (
    <div data-testid="watch-root" style={csx(s.page)}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[1000] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-black"
      >
        {t('iptv.skipToContent')}
      </a>
      <AppHeader
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main id="main" ref={mainRef} style={csx(s.main)}>
        {/* Left column: player + channel meta + share (.dc:50-63) */}
        <div ref={leftColRef} style={csx(s.leftCol)}>
          <VideoPlayer playback={playback} onConfigure={() => setSettingsOpen(true)} />

          {/* .dc:55-58 — current channel meta tile + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <ChannelTile logo={cur.logo} name={cur.name} size={48} radius="50%" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{cur.name}</h1>
          </div>

          {/* two-column: carousel fills the left column beside the EPG rail */}
          {twoCol && channelRows}
        </div>

        {/* Aside: Suggested | Schedule (.dc:65-152) */}
        <aside style={csx(s.aside)}>
          {/* .dc:66-69 — tab toggle */}
          <div style={csx(s.toggle)}>
            <button onClick={() => setView('suggest')} style={csx(tabStyle(view === 'suggest'))}>
              {t('iptv.tabs.suggested')}
            </button>
            <button onClick={() => setView('epg')} style={csx(tabStyle(view === 'epg'))}>
              {t('iptv.tabs.schedule')}
            </button>
          </div>

          {view === 'suggest' ? (
            <SuggestedGrid
              channels={channels}
              current={cur}
              onSelect={onSelect}
              colors={GROUP_COLORS}
            />
          ) : (
            // .dc:90-98 — EPG card: channel-name + date-pill header, then EpgPanel.
            <div style={csx(s.epgCard)}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 16px 12px',
                  gap: 10,
                }}
              >
                <h2 style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>{cur.name}</h2>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#1d1d22',
                    border: '1px solid #2c2c33',
                    borderRadius: 9999,
                    padding: '7px 13px',
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon name="calendar" size={15} />
                  {dateLabel}
                </div>
              </div>
              <EpgPanel channel={cur} />
            </div>
          )}
        </aside>
      </main>

      <ChannelDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        channels={channels}
        current={cur}
        onSelect={onSelect}
      />

      <SourceSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default Watch;
