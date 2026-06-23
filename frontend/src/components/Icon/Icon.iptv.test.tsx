import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Icon from '@components/Icon';

describe('Icon (iptv additions)', () => {
  it.each(['play', 'cast', 'settings', 'share', 'list'] as const)('renders %s', (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
