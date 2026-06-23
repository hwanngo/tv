import { z } from 'zod';

/**
 * Runtime validation of Vite env vars. Imported once at startup (see main.tsx) so
 * the app fails fast with a clear message instead of surfacing `undefined` deep in
 * the call stack. Unknown `import.meta.env` keys (MODE, DEV, …) are stripped.
 */
export const envSchema = z.object({
  // App API base. Empty string is allowed (frontend-only template with no backend).
  VITE_API_BASE_URL: z.union([z.url(), z.literal('')]).default(''),
  // Placeholder REST API used by the TanStack Query example hooks (Phase 3).
  VITE_JSONPLACEHOLDER_URL: z.url().default('https://jsonplaceholder.typicode.com'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = z.flattenError(parsed.error).fieldErrors;
  console.error('❌ Invalid environment variables:\n', issues);
  const message = 'Invalid environment variables — check your .env file against .env.example.';
  // Surface the failure on the page itself — throwing alone leaves a silent white screen.
  if (typeof document !== 'undefined') {
    document.body.textContent = `${message}\n\n${JSON.stringify(issues, null, 2)}`;
  }
  throw new Error(message);
}

export const env = parsed.data;
