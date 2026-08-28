/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables instrumentation.ts (used for Sentry server init).
  experimental: {
    instrumentationHook: true,
  },
};

// Wire the Sentry build plugin only when a DSN is configured, keeping the
// build light (and identical to a plain Next.js build) when it is not.
const withSentry = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export default withSentry
  ? (await import("@sentry/nextjs")).withSentryConfig(nextConfig, {
      silent: true,
      org: "",
      project: "",
    })
  : nextConfig;
