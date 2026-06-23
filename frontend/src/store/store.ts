import { StoreApi, create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UISlice, createUISlice } from './ui-slice';
import { IptvSlice, createIptvSlice } from './iptv-slice';
import migrate from './migrate';

export type StoreState = UISlice & IptvSlice;

export type StoreSlice<T> = (
  set: StoreApi<StoreState>['setState'],
  get: StoreApi<StoreState>['getState']
) => T;

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createUISlice(set, get),
      ...createIptvSlice(set, get),
    }),
    {
      name: 'iptv-play',
      partialize: (state) => ({
        source: state.source,
        lastChannelId: state.lastChannelId,
        muted: state.muted,
        volume: state.volume,
      }),
      version: 7,
      migrate,
    }
  )
);

export default useStore;
