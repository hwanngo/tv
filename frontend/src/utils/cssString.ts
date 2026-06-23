import type { CSSProperties } from 'react';

const camel = (s: string): string => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** Convert a CSS declaration string ("a:b;c:d") into a React style object. Lets us
 *  port the .dc inline-style strings verbatim instead of hand-translating each. */
export function csx(decl: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const part of decl.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (key) out[camel(key)] = val;
  }
  return out;
}
