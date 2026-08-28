/**
 * Sentry — Server-side initialization (Next.js instrumentation).
 *
 * Enabled via the `experimental.instrumentationHook` flag in next.config.mjs.
 * Entirely inert when SENTRY_DSN is not configured, so the build and runtime
 * work fine without error monitoring.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
        ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0.1,
      // Adjust this in production as you see fit:
      debug: false,
    });
  }
}
