import { useTranslation } from 'react-i18next';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

const SIZE: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

const Spinner = ({ size = 'md', label }: SpinnerProps) => {
  const { t } = useTranslation();

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`${SIZE[size]} rounded-full border-[var(--border-mid)] border-t-[var(--accent)] animate-spin`}
        role="status"
        aria-label={label ?? t('common.loading')}
      />
      {label && <span className="text-sm text-[var(--fg-2)]">{label}</span>}
    </div>
  );
};

export default Spinner;
