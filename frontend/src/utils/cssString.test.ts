import { describe, expect, it } from 'vitest';
import { csx } from '@utils/cssString';

describe('csx', () => {
  it('converts a css declaration string to a React style object (camelCase)', () => {
    expect(csx('display:flex;aspect-ratio:16/9;border-radius:10px')).toEqual({
      display: 'flex', aspectRatio: '16/9', borderRadius: '10px',
    });
  });
  it('ignores empty segments and trims', () => {
    expect(csx('color:#fff; ; font-weight:700;')).toEqual({ color: '#fff', fontWeight: '700' });
  });
});
