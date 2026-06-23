import { useEffect, useState } from 'react';
import { breakpointOf, type Breakpoint } from '@src/pages/Watch/watchStyles';

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => breakpointOf(window.innerWidth));
  useEffect(() => {
    const onResize = () => setBp(breakpointOf(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}
