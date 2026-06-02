// Server-side Sentry init. SENTRY_DSN gates the whole thing — no DSN
// means no init, no network calls, no fees. Wired up so prod errors stop
// being invisible without forcing us to pay for it before launch.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? "production",
    // Performance tracing — sample low to keep usage in the free tier.
    tracesSampleRate: 0.1,
    // Errors only by default. Replay/profiling can be enabled per-incident.
    enabled: true,
  });
}
