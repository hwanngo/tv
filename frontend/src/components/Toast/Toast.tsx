import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import Icon, { type IconName } from '@components/Icon';
import { ToastStatus, ToastItem } from '@type/app';

const STATUS_COLOR: Record<ToastStatus, string> = {
  success: 'bg-[var(--accent)]',
  error: 'bg-[var(--error)]',
  warning: 'bg-[var(--fg-3)]',
};

/** Foreground matched to each fill so the glyph keeps AA contrast across every design. */
const STATUS_FG: Record<ToastStatus, string> = {
  success: 'text-[var(--accent-fg)]',
  error: 'text-[var(--error-fg)]',
  warning: 'text-[var(--bg-card)]',
};

const STATUS_ICON: Record<ToastStatus, IconName> = {
  success: 'check',
  error: 'close',
  warning: 'warning',
};

const ToastRow = ({ toast }: { toast: ToastItem }) => {
  const { t } = useTranslation();
  const dismissToast = useStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <div
      role="alert"
      className="flex w-full max-w-xs items-center rounded-lg border border-[var(--border)] bg-brand-card p-4 text-[var(--fg)] shadow-[var(--shadow-float)] dark:bg-brand-inkSoft"
    >
      <div
        className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${STATUS_FG[toast.status]} ${STATUS_COLOR[toast.status]}`}
      >
        <Icon name={STATUS_ICON[toast.status]} size={16} />
      </div>
      <div className="ml-3 text-sm font-normal">{toast.message}</div>
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={() => dismissToast(toast.id)}
        className="-mx-1.5 -my-1.5 ml-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg p-1.5 text-[var(--fg-2)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
};

/** Renders the global toast queue as a stack of auto-dismissing notifications. */
const Toast = () => {
  const toasts = useStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="fixed right-5 bottom-5 z-[1000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default Toast;
