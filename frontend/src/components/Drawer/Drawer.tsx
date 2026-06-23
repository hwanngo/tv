import React, { useEffect, useId, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Icon from '@components/Icon';
import { useFocusTrap } from '@hooks/useFocusTrap';
import { classNames } from '@utils/classNames';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  width?: string;
  closeLabel?: string;
}

// Enter a touch slower than exit: opening feels deliberate, closing feels
// responsive (Material/HIG motion guidance — exit ~70% of enter).
const ENTER_MS = 300;
const EXIT_MS = 220;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Drawer = ({
  open,
  onClose,
  side = 'right',
  title,
  children,
  ariaLabel,
  width,
  closeLabel,
}: DrawerProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // `mounted` keeps the portal alive through the slide-OUT; `shown` drives the
  // on/off-screen transform + backdrop fade. Splitting the two is what gives us a
  // real exit animation — the old code returned null on close and unmounted instantly.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useFocusTrap(open, panelRef, onClose);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (prefersReducedMotion()) {
        setShown(true);
        return;
      }
      // Commit the off-screen first paint before flipping to the on-screen
      // transform, so the browser actually runs the transition (two rAFs).
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    // Closing: slide out, then unmount after the exit duration. A timeout (rather
    // than transitionend) guarantees the unmount even if the transition is skipped.
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  const modalRoot = document.getElementById('modal-root') ?? document.body;
  const offscreen = side === 'left' ? 'translateX(-100%)' : 'translateX(100%)';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999]">
      <div
        data-testid="drawer-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-brand-ink/50 transition-opacity motion-reduce:transition-none"
        style={{
          opacity: shown ? 1 : 0,
          transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms`,
          transitionTimingFunction: shown ? 'ease-out' : 'ease-in',
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        style={{
          width: width ?? undefined,
          transform: shown ? 'translateX(0)' : offscreen,
          transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms`,
          transitionTimingFunction: shown ? 'ease-out' : 'ease-in',
        }}
        className={classNames(
          'absolute top-0 bottom-0 flex w-full max-w-sm flex-col bg-[var(--bg-card)] border-[var(--border)] shadow-[var(--shadow-float)] transition-transform will-change-transform motion-reduce:transition-none',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] p-4">
          {title ? (
            <h3 id={titleId} className="ml-2 text-lg font-semibold text-[var(--fg)]">
              {title}
            </h3>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label={closeLabel ?? 'Close'}
            onClick={onClose}
            className="inline-flex cursor-pointer items-center rounded-lg p-1.5 text-[var(--fg-3)] transition-colors hover:bg-brand-sand hover:text-[var(--fg)] dark:hover:bg-brand-inkSoft"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="hide-scroll-bar min-h-0 flex-1 overflow-y-auto p-6 text-[var(--fg-2)]">
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default Drawer;
