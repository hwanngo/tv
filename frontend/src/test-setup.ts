import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import useStore from '@store/store';
import { DEFAULT_SOURCE } from '@constants/iptv';

// Initialise i18next synchronously with empty resources so `useTranslation()` is
// ready during tests (no HTTP backend). Missing keys fall back to the key string,
// which keeps assertions decoupled from copy — assert on literal/non-i18n text.
void i18n.use(initReactI18next).init({
  lng: 'en-US',
  fallbackLng: 'en-US',
  ns: ['main'],
  defaultNS: 'main',
  resources: { 'en-US': { main: {} } },
  interpolation: { escapeValue: false },
});

// Isolate tests: unmount the React tree and reset shared mutable state (the
// persisted Zustand store singleton + localStorage) after every test, so one
// test's source/lastChannelId/toasts can't leak into a later full-app render.
afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* localStorage may be unavailable in some environments */
  }
  // Guarded: files that vi.mock('@store/store') get a mock without setState.
  const store = useStore as unknown as { setState?: (partial: unknown) => void };
  if (typeof store.setState === 'function') {
    store.setState({
      source: DEFAULT_SOURCE,
      lastChannelId: null,
      toasts: [],
    });
  }
});
