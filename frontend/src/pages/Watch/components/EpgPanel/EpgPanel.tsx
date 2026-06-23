/** EpgPanel — schedule content area: Timeline/Now-Next pill toggle + active sub-view + empty state.
 *  Full code from task-13-brief.md Step 3. The surrounding card chrome (channel-name header,
 *  date selector, Suggested vs Schedule tab toggle) is assembled in Task 16.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEpg } from '@hooks/useEpg';
import { useNow } from '@hooks/useNow';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { buildEpg } from '@utils/epg';
import { csx } from '@utils/cssString';
import { pillStyle, makeStyles } from '@src/pages/Watch/watchStyles';
import EpgTimeline from '../EpgTimeline';
import EpgNowNext from '../EpgNowNext';
import EmptyState from '@components/EmptyState';
import type { Channel } from '@type/iptv';

const EpgPanel = ({ channel }: { channel: Channel }) => {
  const { t } = useTranslation();
  const bp = useBreakpoint();
  const s = makeStyles({ bp, drawerOpen: false, settingsOpen: false, status: '' });
  const now = useNow();
  const { programmes } = useEpg(channel.id, channel.tvgId);
  const [view, setView] = useState<'timeline' | 'nownext'>('timeline');
  const epg = buildEpg(programmes, now);

  if (!programmes.length) {
    return <div style={{ padding: 24 }}><EmptyState title={t('iptv.epg.empty')} /></div>;
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px' }}>
        <button aria-pressed={view === 'timeline'} onClick={() => setView('timeline')} style={csx(pillStyle(view === 'timeline'))}>{t('iptv.epg.timeline')}</button>
        <button aria-pressed={view === 'nownext'} onClick={() => setView('nownext')} style={csx(pillStyle(view === 'nownext'))}>{t('iptv.epg.nowNext')}</button>
      </div>
      {view === 'timeline'
        ? <EpgTimeline items={epg.timeline} listStyle={s.epgList} />
        : <EpgNowNext live={epg.live} upcoming={epg.upcoming} listStyle={s.epgList} />}
    </div>
  );
};

export default EpgPanel;
