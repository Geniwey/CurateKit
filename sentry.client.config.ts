/**
 * Sentry — Client-side initialization.
 *
 * Imported once from the root layout. Inert unless NEXT_PUBLIC_SENTRY_DSN is
 * configured, in which case client-side errors and spans are captured.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    debug: false,
  });
}

export {};
