/**
 * Smoke tests for SourceSettingsModal.
 * - Renders open; the source dropdown lists countries (mocked)
 * - Picking a country then Apply calls setSource with its playlist
 * - Cancel closes without saving
 *
 * Mocks: react-i18next (passthrough t), @store/store (spy setSource),
 *        @hooks/useBreakpoint ('desktop'), @hooks/useCountries (one country),
 *        @components/Icon (stub).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { countryPlaylistUrl } from '@constants/iptv';
import SourceSettingsModal from './SourceSettingsModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock('@hooks/useBreakpoint', () => ({
  useBreakpoint: () => 'desktop',
}));

// Country list is mocked (no network) so the dropdown has a pickable option.
vi.mock('@hooks/useCountries', () => ({
  useCountries: () => ({
    countries: [{ name: 'Việt Nam', code: 'vn', flag: '🇻🇳' }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@components/Icon', () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const mockSetSource = vi.fn();
const mockSource = { playlist: '', epg: '', backend: '' };

vi.mock('@store/store', () => ({
  default: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = { source: mockSource, setSource: mockSetSource };
    return selector(state);
  },
}));

const openDropdown = () => fireEvent.click(screen.getByText('iptv.settings.chooseSource'));

beforeEach(() => {
  mockSetSource.mockReset();
});

describe('SourceSettingsModal', () => {
  it('(a) lists country options once the source dropdown is opened', () => {
    render(<SourceSettingsModal open={true} onClose={vi.fn()} />);
    openDropdown();
    expect(screen.getByText('Việt Nam')).toBeInTheDocument();
  });

  it('(b) keeps the modal in the DOM when closed', () => {
    const { container } = render(<SourceSettingsModal open={false} onClose={vi.fn()} />);
    expect(container.querySelector('[role="dialog"]')).toBeDefined();
  });

  it('(c) picking a country then Apply calls setSource with its playlist', () => {
    const onClose = vi.fn();
    render(<SourceSettingsModal open={true} onClose={onClose} />);

    openDropdown();
    fireEvent.click(screen.getByText('Việt Nam'));
    fireEvent.click(screen.getByText('iptv.settings.apply'));

    expect(mockSetSource).toHaveBeenCalledTimes(1);
    expect(mockSetSource).toHaveBeenCalledWith(
      expect.objectContaining({ playlist: countryPlaylistUrl('vn') })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('(d) Cancel calls onClose without setSource', () => {
    const onClose = vi.fn();
    render(<SourceSettingsModal open={true} onClose={onClose} />);

    fireEvent.click(screen.getByText('iptv.settings.cancel'));

    expect(mockSetSource).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
