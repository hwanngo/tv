import { api } from '@api/client';
import type { Channel, Programme, Source } from '@type/iptv';

const trim = (s: string) => s.replace(/\/$/, '');

/** Backend channel list (authoritative; hides udp:// urls). */
export const fetchChannels = (source: Source, signal?: AbortSignal) =>
  api.get<Channel[]>(`${trim(source.backend)}/api/channels`, {
    params: { playlist: source.playlist, epg: source.epg },
    signal,
  });

/** Backend EPG for one channel (id or tvg-id). */
export const fetchEpg = (channelKey: string, source: Source, signal?: AbortSignal) =>
  api.get<Programme[]>(`${trim(source.backend)}/api/epg`, {
    params: { channel: channelKey, epg: source.epg },
    signal,
  });
