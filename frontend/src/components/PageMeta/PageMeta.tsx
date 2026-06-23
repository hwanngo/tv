import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '@constants/app';

interface PageMetaProps {
  /** i18n key for the page title. */
  titleKey: string;
  /** Optional i18n key for the meta description. */
  descriptionKey?: string;
}

/**
 * Localized document metadata using React 19's native hoisting of <title>/<meta>.
 * The title is recomputed from `t()` each render, so it re-hoists on language change.
 * Keeps <html lang> in sync with the active locale.
 */
const PageMeta = ({ titleKey, descriptionKey }: PageMetaProps) => {
  const { t, i18n } = useTranslation();
  const title = `${t(titleKey)} · ${APP_NAME}`;
  const description = descriptionKey ? t(descriptionKey) : undefined;

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
    </>
  );
};

export default PageMeta;
