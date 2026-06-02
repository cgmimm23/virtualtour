// Next.js instrumentation hook — runs once at server startup. Loads the
// right Sentry config based on runtime. No-op when SENTRY_DSN isn't set
// (the config files themselves gate on the env var).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
