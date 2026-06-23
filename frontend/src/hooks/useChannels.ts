import { useQuery } from '@tanstack/react-query';
import useStore from '@store/store';
import { fetchChannels } from '@api/iptv';
import { parseM3U } from '@utils/m3u';
import { FALLBACK_CHANNELS } from '@constants/iptv';
import { isHttpUrl } from '@utils/resolveSrc';
import type { Channel, Source } from '@type/iptv';

export const channelKeys = {
  list: (s: Source) => ['channels', s.backend, s.playlist, s.epg] as const,
};

async function loadChannels(source: Source, signal: AbortSignal): Promise<Channel[]> {
  // An HTTP(S) playlist (e.g. an iptv-org country list) is made of direct streams —
  // parse it client-side and play in the browser; no backend needed.
  if (isHttpUrl(source.playlist)) {
    const res = await fetch(source.playlist, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = parseM3U(await res.text());
    if (!list.length) throw new Error('NO_CHANNELS');
    return list;
  }
  // No client-parseable playlist but a bridge is configured → the bridge serves its
  // own (udp://) channel list at /api/channels.
  if (source.backend) {
    return fetchChannels(source, signal);
  }
  // Nothing configured → the curated teaser list.
  return FALLBACK_CHANNELS;
}

export function useChannels() {
  const source = useStore((s) => s.source);
  // Curated teaser only when there's no playlist to parse and no bridge to ask.
  const showFallback = !isHttpUrl(source.playlist) && !source.backend;
  const query = useQuery({
    queryKey: channelKeys.list(source),
    queryFn: ({ signal }) => loadChannels(source, signal),
    placeholderData: showFallback ? FALLBACK_CHANNELS : undefined,
  });
  return {
    channels: query.data ?? (showFallback ? FALLBACK_CHANNELS : []),
    isLoading: query.isLoading,
    error: query.error,
  };
}
