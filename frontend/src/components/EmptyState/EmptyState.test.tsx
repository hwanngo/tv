import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(
      <EmptyState title="No results found" description="Try adjusting your search filters." />
    );
    expect(screen.getByText('Try adjusting your search filters.')).toBeInTheDocument();
  });

  it('renders the action node when provided', () => {
    render(<EmptyState title="No items yet" action={<button>Create</button>} />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('omits description when not provided', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.queryByTestId('empty-state-description')).not.toBeInTheDocument();
  });
});
