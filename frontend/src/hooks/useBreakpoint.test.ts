import { describe, expect, it, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBreakpoint } from '@hooks/useBreakpoint';

const setWidth = (w: number) => { Object.defineProperty(window, 'innerWidth', { value: w, configurable: true }); };
afterEach(() => setWidth(1024));

describe('useBreakpoint', () => {
  it('classifies width into the four breakpoints', () => {
    setWidth(500);  expect(renderHook(() => useBreakpoint()).result.current).toBe('mobile');
    setWidth(700);  expect(renderHook(() => useBreakpoint()).result.current).toBe('tabletP');
    setWidth(1100); expect(renderHook(() => useBreakpoint()).result.current).toBe('tabletL');
    setWidth(1400); expect(renderHook(() => useBreakpoint()).result.current).toBe('desktop');
  });
});
