/**
 * Watch page assembly tests.
 *
 * Strategy: mock @hooks/useChannels with a known 3-channel list and mount the real
 * route tree (RouterProvider + memory history) so the ?ch= deep-link path is exercised.
 * usePlayer is stubbed (hls.js is a no-op in jsdom); react-i18next passes keys through.
 *
 * - At "/" the first channel (no ?ch=, no persisted last) is current → its name shows.
 * - At "/?ch=<id>" the deep-linked channel is current → its name shows.
 *
 * The current channel renders its name twice in the aside region — the meta tile
 * label (.dc:57, font-size 20) and the EPG-card header (.dc:92, font-size 17) — so we
 * assert presence of BOTH to confirm "current", rather than absence elsewhere (the
 * featured channel legitimately also appears in the desktop ChannelRows cards).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '@src/router';
import RoutePending from '@components/RoutePending';
import type { Channel } from '@type/iptv';

// ── Known channel fixtures ────────────────────────────────────────────────────
const CHANNELS: Channel[] = [
  { id: 'alpha', name: 'Alpha One', group: 'News', logo: '', tvgId: '', url: '', featured: true, live: true },
  { id: 'bravo', name: 'Bravo Two', group: 'Sports', logo: '', tvgId: '', url: '', featured: false, live: false },
  { id: 'charlie', name: 'Charlie Three', group: 'Movies', logo: '', tvgId: '', url: '', featured: false, live: false },
];

// ── useChannels: fixed list, no loading/error ─────────────────────────────────
vi.mock('@hooks/useChannels', () => ({
  useChannels: () => ({ channels: CHANNELS, isLoading: false, error: null }),
}));

// ── usePlayer: hls.js is a no-op under jsdom ──────────────────────────────────
vi.mock('@hooks/usePlayer', () => ({ usePlayer: () => {} }));

// ── i18n: passthrough keys (assert against literal channel names, not copy) ───
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

// Names of the current channel rendered in the aside (meta tile + EPG header),
// identified by their distinct inline font-size (20 = meta .dc:57, 17 = EPG header .dc:92).
const currentNameCount = (name: string): number =>
  screen
    .queryAllByText(name)
    .filter((el) => /font-size:\s*(20|17)px/.test(el.getAttribute('style') ?? '')).length;

describe('Watch page', () => {
  it('selects the first channel by default at "/"', async () => {
    renderAt('/');
    // Current channel (Alpha) appears in both meta + EPG header; a non-current channel
    // (Charlie) never appears in the aside current-channel slots. waitFor: the lazy
    // route + render can lag the first text match under parallel-worker contention.
    await waitFor(() => expect(currentNameCount('Alpha One')).toBe(2), { timeout: 5000 });
    expect(currentNameCount('Charlie Three')).toBe(0);
  });

  it('selects the deep-linked channel at "/?ch=<id>"', async () => {
    renderAt('/?ch=charlie');
    await waitFor(() => expect(currentNameCount('Charlie Three')).toBe(2), { timeout: 5000 });
    // Alpha is no longer the current channel (it may still appear in row cards).
    expect(currentNameCount('Alpha One')).toBe(0);
  });
});
