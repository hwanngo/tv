import { useTranslation } from 'react-i18next';

/** Friendly, localized fallback shown by ErrorBoundary and the route error element. */
const ErrorFallback = ({ onReset }: { onReset?: () => void }) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-xl mx-auto px-6 py-32 text-center space-y-5">
      <p className="font-mono text-sm text-[var(--error)]">{t('error.eyebrow')}</p>
      <h1 className="font-serif text-3xl font-medium text-[var(--fg)] leading-tight">
        {t('error.title')}
      </h1>
      <p className="text-[var(--fg-2)] max-w-md mx-auto leading-relaxed">{t('error.message')}</p>
      <div className="flex items-center justify-center gap-3">
        {onReset && (
          <button onClick={onReset} className="btn btn-primary text-sm">
            {t('error.retry')}
          </button>
        )}
        <button onClick={() => window.location.reload()} className="btn btn-neutral text-sm">
          {t('error.reload')}
        </button>
      </div>
    </div>
  );
};

export default ErrorFallback;
