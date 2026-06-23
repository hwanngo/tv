import { describe, expect, it } from 'vitest';
import { DEFAULT_SOURCE } from '@constants/iptv';

describe('iptv constants', () => {
  it('defaults to no selected source (empty playlist) on the same-origin bridge', () => {
    expect(DEFAULT_SOURCE.playlist).toBe('');
    expect(DEFAULT_SOURCE.backend).toBe('/bridge');
  });
});
