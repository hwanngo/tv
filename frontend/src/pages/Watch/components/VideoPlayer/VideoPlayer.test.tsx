import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import VideoPlayer from './VideoPlayer';

vi.mock('hls.js', () => ({
  default: { isSupported: () => false, Events: {} },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

beforeAll(() => {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

describe('VideoPlayer', () => {
  it('renders a <video> element for direct playback', () => {
    const { container } = render(
      <VideoPlayer playback={{ kind: 'direct', url: 'https://x/a.m3u8' }} />
    );
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('starts unmuted and renders the custom live control bar (direct playback)', () => {
    const { container, getByText, getByLabelText } = render(
      <VideoPlayer playback={{ kind: 'direct', url: 'https://x/a.m3u8' }} />
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.muted).toBe(false); // unmuted by default (usePlayer mutes only if autoplay is blocked)
    expect(video.hasAttribute('controls')).toBe(false); // custom bar, not native
    expect(getByText('iptv.epg.live')).not.toBeNull(); // LIVE tag (no seek bar)
    expect(getByLabelText('iptv.player.fullscreen')).not.toBeNull(); // fullscreen control
  });

  it('shows needsBridge overlay and hides mute toggle when playback.kind === needsBridge', () => {
    const { getByText, queryByLabelText } = render(
      <VideoPlayer playback={{ kind: 'needsBridge' }} />
    );
    expect(getByText('iptv.player.needsBridge')).not.toBeNull();
    expect(queryByLabelText('iptv.player.unmute')).toBeNull();
  });

  it('renders a <video> for bridge (go2rtc HLS) playback', () => {
    const { container } = render(
      <VideoPlayer playback={{ kind: 'bridge', url: 'http://localhost:1984/api/stream.m3u8?src=ch1' }} />
    );
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('shows a loading indicator initially for direct playback', () => {
    const { getByText } = render(
      <VideoPlayer playback={{ kind: 'direct', url: 'https://x/a.m3u8' }} />
    );
    expect(getByText('iptv.player.loading')).not.toBeNull();
  });
});
