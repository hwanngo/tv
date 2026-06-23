import { env } from '@src/env';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public method: string,
    public url: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  /** Request timeout in ms. Defaults to 30s; pass 0 to disable. */
  timeoutMs?: number;
}

const BASE_URL = env.VITE_API_BASE_URL;
const DEFAULT_TIMEOUT_MS = 30_000;

/** Join base + path without double slashes; append params with `?` or `&` as needed. */
function buildUrl(path: string, params?: Record<string, string>): string {
  // Absolute URLs (e.g. a third-party API) bypass BASE_URL; relative paths are prefixed.
  const base = /^https?:\/\//i.test(path)
    ? path
    : `${path.startsWith('/') ? BASE_URL.replace(/\/$/, '') : BASE_URL}${path}`;
  if (!params) return base;
  return `${base}${base.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;
}

/** Pull a JSON `message` field out of an error body; fall back to raw text, then statusText. */
function extractErrorMessage(text: string, statusText: string): string {
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }
  } catch {
    // Not JSON — fall through to raw text.
  }
  return text || statusText;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const url = buildUrl(path, params);
  const method = init.method ?? 'GET';

  // Every request gets a default timeout; a caller-provided signal is combined with it.
  const timeoutSignal = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;
  const signal =
    init.signal && timeoutSignal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : (init.signal ?? timeoutSignal);

  const res = await fetch(url, {
    ...init,
    signal,
    headers: {
      // Only send Content-Type alongside a body — avoids a needless CORS preflight on GET/DELETE.
      ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, extractErrorMessage(text, res.statusText), method, url);
  }

  // 204 / empty bodies resolve to undefined instead of crashing on res.json().
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),

  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),

  del: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'DELETE', ...options }),
};
