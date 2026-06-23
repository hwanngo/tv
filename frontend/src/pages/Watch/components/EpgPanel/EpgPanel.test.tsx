/**
 * Smoke tests for EpgPanel.
 * Mocks: useEpg (to control programme data), useNow (fixed clock), useStore (source),
 *        react-i18next useTranslation (passthrough t).
 * Wraps render in QueryClientProvider (required by useEpg → useQuery).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EpgPanel from './EpgPanel';
import type { Channel } from '@type/iptv';

// ── i18n: passthrough ──────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// ── Fixed "now" so isLive/isPast calculations are deterministic ────────────────
const FIXED_NOW = new Date('2024-01-15T20:30:00Z').getTime();
vi.mock('@hooks/useNow', () => ({
  useNow: () => FIXED_NOW,
}));

// ── useEpg mock — overridden per test ─────────────────────────────────────────
const mockProgrammes: { programmes: { start: string; stop: string; title: string }[] } = {
  programmes: [],
};
vi.mock('@hooks/useEpg', () => ({
  useEpg: () => mockProgrammes,
}));

// ── useStore mock (required by useEpg internals that import it) ───────────────
vi.mock('@store/store', () => ({
  default: (sel: (s: object) => unknown) =>
    sel({ source: { playlist: '', epg: '', backend: '' } }),
}));

// ── Test wrapper ──────────────────────────────────────────────────────────────
const channel: Channel = {
  id: 'ch1',
  tvgId: 'ch1',
  name: 'Channel One HD',
  group: 'News',
  logo: '',
  url: 'https://x/ch1.m3u8',
  live: true,
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('EpgPanel', () => {
  beforeEach(() => {
    mockProgrammes.programmes = [];
  });

  it('(a) shows empty-state text when there are no programmes', () => {
    mockProgrammes.programmes = [];
    render(<EpgPanel channel={channel} />, { wrapper });
    // EmptyState renders title in an <h3>; t() is a passthrough so the key is rendered
    expect(screen.getByText('iptv.epg.empty')).toBeInTheDocument();
  });

  it('(b) shows a programme title when data is present', () => {
    mockProgrammes.programmes = [
      { start: '2024-01-15T20:00:00Z', stop: '2024-01-15T21:00:00Z', title: 'Thời Sự 20h' },
      { start: '2024-01-15T21:00:00Z', stop: '2024-01-15T22:00:00Z', title: 'Phim Tối' },
    ];
    render(<EpgPanel channel={channel} />, { wrapper });
    expect(screen.getByText('Thời Sự 20h')).toBeInTheDocument();
  });
});
