import type { IconName } from '@components/Icon';
import Icon from '@components/Icon';
import { classNames } from '@utils/classNames';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={classNames(
      'flex flex-col items-center justify-center text-center py-16 px-6',
      className
    )}
  >
    {icon && (
      <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-hover)] text-[var(--fg-3)]">
        <Icon name={icon} size={22} aria-hidden />
      </div>
    )}

    <h3 className="font-medium text-[var(--fg)] mb-1">{title}</h3>

    {description && (
      <p className="text-sm text-[var(--fg-2)] max-w-sm" data-testid="empty-state-description">
        {description}
      </p>
    )}

    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
