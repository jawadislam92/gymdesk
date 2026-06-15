'use client';

import { useEffect } from 'react';

/** Registers the service worker so the app is installable (PWA). */
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
