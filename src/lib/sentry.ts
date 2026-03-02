import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  console.log('[SENTRY_DEBUG] MODE:', import.meta.env.MODE);
  console.log('[SENTRY_DEBUG] DSN present:', Boolean(dsn));

  if (!dsn) {
    console.warn('[SENTRY_DEBUG] No VITE_SENTRY_DSN found at runtime');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });

  console.log('[SENTRY_DEBUG] Sentry.init called');
  Sentry.captureMessage('[SENTRY_DEBUG] init message from app startup');
}
