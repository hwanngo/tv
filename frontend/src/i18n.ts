import i18n, { type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LANGUAGE } from '@constants/app';

// Locale JSON is bundled at build time via Vite's glob import — the app ships
// self-contained with no runtime fetch. This keeps the production build portable
// (including the single-file build, `pnpm build:single`) and removes a network
// round-trip before first paint. Vite still hot-reloads these files in dev.
// To add a language: drop a `src/locales/<lng>/main.json` and list it in
// `supportedLngs` below.
const modules = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/main.json', {
  eager: true,
});

const resources: Resource = {};
for (const [path, mod] of Object.entries(modules)) {
  const lng = path.match(/locales\/([^/]+)\/main\.json$/)?.[1];
  if (lng) resources[lng] = { main: mod.default };
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['en-US', 'vi-VN'],
    ns: ['main'],
    defaultNS: 'main',
    detection: {
      // Vietnamese by default: honour only an explicit stored choice, so the
      // browser's navigator language can't flip a fresh visitor to English.
      order: ['localStorage'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
