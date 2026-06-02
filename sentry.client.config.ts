// Browser-side Sentry init. Uses NEXT_PUBLIC_SENTRY_DSN since the value
// has to ship to the client. Same gate — no DSN, no init.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    // Replay only on errors so we don't blow through the free quota.
    replaysOnErrorSampleRate: 0.5,
    replaysSessionSampleRate: 0,
    integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
  });
}
