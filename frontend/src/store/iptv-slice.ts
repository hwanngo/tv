import type { Source } from '@type/iptv';
import { DEFAULT_SOURCE } from '@constants/iptv';
import { StoreSlice } from './store';

export interface IptvSlice {
  source: Source;
  setSource: (source: Source) => void;
  lastChannelId: string | null;
  setLastChannelId: (id: string | null) => void;
  /** Persisted player audio preference (sticky across reloads). */
  muted: boolean;
  setMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export const createIptvSlice: StoreSlice<IptvSlice> = (set) => ({
  source: DEFAULT_SOURCE,
  setSource: (source) => set((prev) => ({ ...prev, source })),
  lastChannelId: null,
  setLastChannelId: (lastChannelId) => set((prev) => ({ ...prev, lastChannelId })),
  muted: false,
  setMuted: (muted) => set((prev) => ({ ...prev, muted })),
  volume: 1,
  setVolume: (volume) => set((prev) => ({ ...prev, volume })),
});
