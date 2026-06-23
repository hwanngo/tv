import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '@src/router';
import RoutePending from '@components/RoutePending';
import type { Channel } from '@type/iptv';

// ── Minimal channel stub so Watch renders without network I/O ─────────────────
const STUB_CHANNELS: Channel[] = [
  { id: 'stub', tvgId: 'stub', name: 'Stub', group: 'Test', logo: '', url: '', live: false },
];

vi.mock('@hooks/useChannels', () => ({
  useChannels: () => ({ channels: STUB_CHANNELS, isLoading: false, error: null }),
}));

// ── usePlayer: hls.js is a no-op under jsdom ──────────────────────────────────
vi.mock('@hooks/usePlayer', () => ({ usePlayer: () => {} }));

// ── i18n: passthrough keys ────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } }),
}));

function renderAt(initialPath: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

describe('router', () => {
  it('renders the Watch page at "/"', async () => {
    renderAt('/');
    // Generous timeout: the Watch route is lazy-loaded; the dynamic import +
    // full render can exceed 1s under parallel-worker CPU contention.
    expect(await screen.findByTestId('watch-root', undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('shows the 404 page for an unknown path', async () => {
    renderAt('/does-not-exist');
    expect(await screen.findByText('404')).toBeInTheDocument();
  });
});
