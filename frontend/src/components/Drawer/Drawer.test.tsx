import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Drawer from './Drawer';

beforeEach(() => {
  // Ensure the portal target exists (mirrors index.html's #modal-root).
  if (!document.getElementById('modal-root')) {
    const root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
});

describe('Drawer', () => {
  it('renders nothing when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Settings">
        <p>Drawer body</p>
      </Drawer>
    );
    expect(screen.queryByText('Drawer body')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and children with dialog role when open', () => {
    render(
      <Drawer open onClose={() => {}} title="Settings">
        <p>Drawer body</p>
      </Drawer>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Drawer body')).toBeInTheDocument();
  });

  it('uses ariaLabel for accessible name when no title', () => {
    render(
      <Drawer open onClose={() => {}} ariaLabel="Filters">
        <p>Body</p>
      </Drawer>
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Settings">
        <p>Drawer body</p>
      </Drawer>
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Settings">
        <p>Drawer body</p>
      </Drawer>
    );
    await user.click(screen.getByTestId('drawer-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Settings">
        <p>Drawer body</p>
      </Drawer>
    );
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays mounted through the slide-out, then unmounts after closing', async () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}} title="Settings">
        <p>Drawer body</p>
      </Drawer>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <Drawer open={false} onClose={() => {}} title="Settings">
        <p>Drawer body</p>
      </Drawer>
    );
    // Still present right after close — the exit animation is running, not an
    // instant unmount (the bug this animation fixed).
    expect(screen.queryByRole('dialog')).toBeInTheDocument();
    // ...and gone once the exit duration elapses.
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });
});
