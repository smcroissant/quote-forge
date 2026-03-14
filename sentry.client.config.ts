import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay (optional, for debugging)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Environment
  environment: process.env.NODE_ENV,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",

  // Ignore common non-critical errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
});
