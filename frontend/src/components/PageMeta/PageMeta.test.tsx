import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import PageMeta from '@components/PageMeta';

describe('PageMeta', () => {
  it('hoists a localized document title', async () => {
    render(<PageMeta titleKey="meta.overview" descriptionKey="meta.overviewDesc" />);
    // React 19 hoists <title>/<meta> into <head>.
    await waitFor(() => expect(document.title).toContain('meta.overview'));
  });

  it('keeps <html lang> in sync with the active locale', async () => {
    render(<PageMeta titleKey="meta.design" />);
    await waitFor(() => expect(document.documentElement.lang).toBe('en-US'));
  });
});
