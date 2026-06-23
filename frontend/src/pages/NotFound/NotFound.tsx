import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import PageMeta from '@components/PageMeta';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-6 py-32 text-center space-y-5">
      <PageMeta titleKey="meta.notFound" />
      <p className="font-mono text-sm text-[var(--accent-text)]">404</p>
      <h1 className="font-serif text-4xl font-medium text-[var(--fg)] leading-tight">
        {t('notFound.title')}
      </h1>
      <p className="text-[var(--fg-2)] max-w-md mx-auto leading-relaxed">{t('notFound.message')}</p>
      <Link to="/" className="btn btn-primary text-sm inline-block">
        {t('notFound.backHome')}
      </Link>
    </div>
  );
};

export default NotFound;
