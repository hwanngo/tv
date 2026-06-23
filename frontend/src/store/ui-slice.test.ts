import { describe, it, expect } from 'vitest';
import useStore from './store';

describe('ui-slice toasts', () => {
  it('adds toasts with unique ids and dismisses by id', () => {
    useStore.setState({ toasts: [] });
    useStore.getState().addToast('success', 'a');
    useStore.getState().addToast('error', 'b');

    const toasts = useStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts.map((t) => t.message)).toEqual(['a', 'b']);
    expect(toasts[0].id).not.toBe(toasts[1].id);

    useStore.getState().dismissToast(toasts[0].id);
    expect(useStore.getState().toasts).toEqual([toasts[1]]);
  });
});
