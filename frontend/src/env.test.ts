import { describe, it, expect } from 'vitest';
import { envSchema } from '@src/env';

describe('env schema', () => {
  it('applies defaults when no vars are provided', () => {
    const parsed = envSchema.parse({});
    expect(parsed.VITE_API_BASE_URL).toBe('');
    expect(parsed.VITE_JSONPLACEHOLDER_URL).toBe('https://jsonplaceholder.typicode.com');
  });

  it('accepts a valid VITE_API_BASE_URL', () => {
    const parsed = envSchema.parse({ VITE_API_BASE_URL: 'https://api.example.com' });
    expect(parsed.VITE_API_BASE_URL).toBe('https://api.example.com');
  });

  it('rejects a malformed VITE_API_BASE_URL', () => {
    const result = envSchema.safeParse({ VITE_API_BASE_URL: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed VITE_JSONPLACEHOLDER_URL', () => {
    const result = envSchema.safeParse({ VITE_JSONPLACEHOLDER_URL: 'nope' });
    expect(result.success).toBe(false);
  });
});
