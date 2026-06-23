import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChannels } from '@hooks/useChannels';
import { FALLBACK_CHANNELS } from '@constants/iptv';
import type { StoreState } from '@store/store';
import type { Source } from '@type/iptv';

const SAMPLE = `#EXTINF:-1 group-title="News",Channel One HD\nhttps://x/ch1.m3u8`;

let mockSource: Source = { playlist: 'https://example.com/list.m3u', epg: '', backend: '' };

vi.mock('@store/store', () => ({
  default: <T,>(sel: (s: StoreState) => T) => sel({ source: mockSource } as StoreState),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useChannels', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(SAMPLE) }));
  });

  it('client-parses an http playlist when no backend is set', async () => {
    mockSource = { playlist: 'https://example.com/list.m3u', epg: '', backend: '' };
    const { result } = renderHook(() => useChannels(), { wrapper });
    await waitFor(() => expect(result.current.channels.length).toBe(1));
    expect(result.current.channels[0].name).toBe('Channel One HD');
  });

  it('fetches the bridge channel list (/api/channels) when there is no http playlist but a backend', async () => {
    mockSource = { playlist: '', epg: '', backend: 'http://localhost:8080' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([{ id: 'ch1', name: 'Channel One', group: 'News', logo: '', tvgId: '' }])),
    }));
    const { result } = renderHook(() => useChannels(), { wrapper });
    await waitFor(() => expect(result.current.channels[0]?.name).toBe('Channel One'));
  });

  it('client-parses an http playlist even when a backend is set (iptv-org needs no bridge)', async () => {
    mockSource = { playlist: 'https://iptv-org.github.io/iptv/countries/us.m3u', epg: '', backend: 'http://localhost:8080' };
    // beforeEach mocks fetch to return the M3U SAMPLE; a backend call would return JSON instead.
    const { result } = renderHook(() => useChannels(), { wrapper });
    await waitFor(() => expect(result.current.channels.length).toBe(1));
    expect(result.current.channels[0].name).toBe('Channel One HD');
  });

  it('returns the (empty) fallback list when there is no playlist and no backend', async () => {
    mockSource = { playlist: '', epg: '', backend: '' };
    const { result } = renderHook(() => useChannels(), { wrapper });
    await waitFor(() => expect(result.current.channels.length).toBe(FALLBACK_CHANNELS.length));
  });
});
