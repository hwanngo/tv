import { useQuery } from '@tanstack/react-query';

export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2 (e.g. "VN")
  flag: string; // emoji
}

const COUNTRIES_URL = 'https://iptv-org.github.io/api/countries.json';

/**
 * All iptv-org countries (~250), each linking to a per-country playlist.
 * Static data — fetched lazily (only when `enabled`, i.e. the source dropdown is
 * opened) and cached for a day so reopening the picker is instant.
 */
export function useCountries(enabled = true) {
  const query = useQuery({
    queryKey: ['iptv-org', 'countries'],
    queryFn: async ({ signal }): Promise<Country[]> => {
      const res = await fetch(COUNTRIES_URL, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Country[];
    },
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  return { countries: query.data ?? [], isLoading: query.isLoading, error: query.error };
}
