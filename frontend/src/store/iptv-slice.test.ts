import { describe, expect, it } from 'vitest';
import { createIptvSlice } from '@store/iptv-slice';
import type { IptvSlice } from '@store/iptv-slice';
import type { StoreState } from '@store/store';
import { DEFAULT_SOURCE } from '@constants/iptv';

describe('iptv slice', () => {
  it('seeds the Option A default source and updates it', () => {
    let state = {} as StoreState;
    const set = (fn: (s: StoreState) => Partial<StoreState>) => { state = { ...state, ...fn(state) }; };
    const get = () => state;
    const slice: IptvSlice = createIptvSlice(
      set as Parameters<typeof createIptvSlice>[0],
      get,
    );
    state = { ...state, ...slice };
    expect(state.source).toEqual(DEFAULT_SOURCE);
    state.setSource({ playlist: 'p', epg: 'e', backend: 'b' });
    expect(state.source).toEqual({ playlist: 'p', epg: 'e', backend: 'b' });
    state.setLastChannelId('ch1hd');
    expect(state.lastChannelId).toBe('ch1hd');
  });
});
