/**
 * Smoke tests for ChannelDrawer.
 * - Renders open with 3 channels across 2 groups
 * - Typing in the search box filters the list
 * - Clicking a channel row calls onSelect with the channel's id
 *
 * Mocks: react-i18next useTranslation (passthrough t),
 *        @components/Icon (stub for Drawer's close button).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChannelDrawer from './ChannelDrawer';
import type { Channel } from '@type/iptv';

// ── i18n: passthrough ──────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// ── Icon stub (used by Drawer's close button) ──────────────────────────────────
vi.mock('@components/Icon', () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// ── Test channels (3 channels, 2 groups) ──────────────────────────────────────
const channels: Channel[] = [
  {
    id: 'ch1',
    tvgId: 'ch1',
    name: 'Channel One HD',
    group: 'News',
    logo: '',
    url: 'https://x/ch1.m3u8',
    live: true,
  },
  {
    id: 'ch2',
    tvgId: 'ch2',
    name: 'Channel Two HD',
    group: 'News',
    logo: '',
    url: 'https://x/ch2.m3u8',
    live: false,
  },
  {
    id: 'ch3',
    tvgId: 'ch3',
    name: 'Channel Three HD',
    group: 'Sports',
    logo: '',
    url: 'https://x/ch3.m3u8',
    live: true,
  },
];

const current = channels[0];

// ── Helper to ensure portal target exists ─────────────────────────────────────
beforeEach(() => {
  if (!document.getElementById('modal-root')) {
    const div = document.createElement('div');
    div.id = 'modal-root';
    document.body.appendChild(div);
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('ChannelDrawer', () => {
  it('(a) renders all channels when open', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ChannelDrawer
        open={true}
        onClose={onClose}
        channels={channels}
        current={current}
        onSelect={onSelect}
      />
    );

    // All 3 channel names should be visible
    expect(screen.getByText('Channel One HD')).toBeInTheDocument();
    expect(screen.getByText('Channel Two HD')).toBeInTheDocument();
    expect(screen.getByText('Channel Three HD')).toBeInTheDocument();
  });

  it('(b) does not render when closed', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ChannelDrawer
        open={false}
        onClose={onClose}
        channels={channels}
        current={current}
        onSelect={onSelect}
      />
    );

    expect(screen.queryByText('Channel One HD')).not.toBeInTheDocument();
  });

  it('(c) search filters the channel list', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ChannelDrawer
        open={true}
        onClose={onClose}
        channels={channels}
        current={current}
        onSelect={onSelect}
      />
    );

    // Find the search input by its placeholder (t() returns the key)
    const searchInput = screen.getByPlaceholderText('iptv.drawer.search');
    expect(searchInput).toBeInTheDocument();

    // Type "Three" — should show only Channel Three HD
    fireEvent.change(searchInput, { target: { value: 'Three' } });

    expect(screen.getByText('Channel Three HD')).toBeInTheDocument();
    expect(screen.queryByText('Channel One HD')).not.toBeInTheDocument();
    expect(screen.queryByText('Channel Two HD')).not.toBeInTheDocument();
  });

  it('(d) clicking a channel row calls onSelect with its id', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ChannelDrawer
        open={true}
        onClose={onClose}
        channels={channels}
        current={current}
        onSelect={onSelect}
      />
    );

    // Click Channel Three HD row via its data-testid
    const ch3Row = screen.getByTestId('channel-row-ch3');
    fireEvent.click(ch3Row);

    expect(onSelect).toHaveBeenCalledWith('ch3');
  });
});
