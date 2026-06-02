import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const config: NextConfig = {
  reactStrictMode: true,
};

// Sentry's build plugin uploads source maps to its dashboard so stack
// traces are readable in prod. It needs SENTRY_AUTH_TOKEN at build time to
// do that upload; without the token, the plugin still wraps the app at
// runtime (errors reported, just with minified stacks). Org/project come
// from env so the same config works for the founder + any future deploys.

const sentryBuildOpts = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
  // Tunnel through our own domain so corporate ad-blockers don't drop
  // browser-side error reports.
  tunnelRoute: "/monitoring",
};

export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(config, sentryBuildOpts)
  : config;
