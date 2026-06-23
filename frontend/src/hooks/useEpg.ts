import { useQuery } from '@tanstack/react-query';
import useStore from '@store/store';
import { fetchEpg } from '@api/iptv';
import type { Source } from '@type/iptv';

export const epgKeys = {
  one: (s: Source, key: string) => ['epg', s.backend, s.epg, key] as const,
};

export function useEpg(channelId: string, tvgId: string) {
  const source = useStore((s) => s.source);
  const key = tvgId || channelId;
  const query = useQuery({
    queryKey: epgKeys.one(source, key),
    queryFn: ({ signal }) => fetchEpg(key, source, signal),
    enabled: !!source.backend && !!source.epg && !!key,
  });
  return {
    programmes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
  };
}
