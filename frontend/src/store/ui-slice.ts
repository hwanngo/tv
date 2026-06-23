import { ToastStatus, ToastItem } from '@type/app';
import { StoreSlice } from './store';

/** Monotonic id source for stacked toasts (module-scoped; not persisted). */
let toastSeq = 0;

export interface UISlice {
  /** Active toast queue — newest last. Rendered as a stack by the Toast component. */
  toasts: ToastItem[];
  addToast: (status: ToastStatus, message: string) => void;
  dismissToast: (id: number) => void;
}

export const createUISlice: StoreSlice<UISlice> = (set) => ({
  toasts: [],
  addToast: (status, message) =>
    set((prev) => ({ ...prev, toasts: [...prev.toasts, { id: ++toastSeq, status, message }] })),
  dismissToast: (id) =>
    set((prev) => ({ ...prev, toasts: prev.toasts.filter((toast) => toast.id !== id) })),
});
