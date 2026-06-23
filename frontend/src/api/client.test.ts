import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError as ApiErrorType } from '@api/client';

/** Minimal Response stand-in matching what the client touches. */
const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  text: () => Promise.resolve(JSON.stringify(body)),
});

/** Stub global fetch with a typed mock so call args can be inspected. */
const stubFetch = (response: unknown) => {
  const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<unknown>>(() =>
    Promise.resolve(response)
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** Re-import the client so it picks up the stubbed env (BASE_URL is read at module load). */
async function loadClient() {
  vi.resetModules();
  return import('@api/client');
}

describe('api client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('keeps Content-Type when the caller passes extra headers on POST', async () => {
    const fetchMock = stubFetch(jsonResponse({ id: 1 }));
    const { api } = await loadClient();

    await api.post('/users', { name: 'Ada' }, { headers: { Authorization: 'Bearer token' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
  });

  it('omits Content-Type on body-less GET requests', async () => {
    const fetchMock = stubFetch(jsonResponse([]));
    const { api } = await loadClient();

    await api.get('/users');

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).not.toHaveProperty('Content-Type');
  });

  it('resolves to undefined on 204 No Content', async () => {
    stubFetch({ ok: true, status: 204, statusText: 'No Content', text: () => Promise.resolve('') });
    const { api } = await loadClient();

    await expect(api.del('/users/1')).resolves.toBeUndefined();
  });

  it('throws ApiError with status and the parsed JSON message on non-2xx', async () => {
    stubFetch(jsonResponse({ message: 'User not found' }, 404));
    const { api, ApiError } = await loadClient();

    const error = (await api.get('/users/99').catch((e: unknown) => e)) as ApiErrorType;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe('User not found');
    expect(error.method).toBe('GET');
    expect(error.url).toBe('https://api.example.com/users/99');
  });

  it('joins a trailing-slash base URL and leading-slash path with a single slash', async () => {
    const fetchMock = stubFetch(jsonResponse([]));
    const { api } = await loadClient();

    await api.get('/users');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/users');
  });

  it('appends params with & when the path already has a query string', async () => {
    const fetchMock = stubFetch(jsonResponse([]));
    const { api } = await loadClient();

    await api.get('/users?active=1', { params: { page: '2' } });

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/users?active=1&page=2');
  });
});
