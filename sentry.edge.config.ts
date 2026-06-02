// Edge-runtime Sentry init (middleware, edge route handlers). Mirrors
// sentry.server.config.ts with the same DSN gate.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    enabled: true,
  });
}
