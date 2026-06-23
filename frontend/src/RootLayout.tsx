import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from '@tanstack/react-router';
import Toast from '@components/Toast';

/** IPTV Play shell: forces the fixed dark theme, syncs <html lang> to the active
 *  locale, and renders the route. The player provides its own header/chrome. */
const RootLayout = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-app', 'iptv');
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <>
      <Outlet />
      <Toast />
    </>
  );
};

export default RootLayout;
