/**
 * PostHog — Product analytics.
 *
 * Everything here is conditional on NEXT_PUBLIC_POSTHOG_KEY being set so the
 * app runs (and builds) fine without analytics configured. Buyers who want
 * analytics only need to add their project API key to `.env`.
 */
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const isPostHogConfigured = Boolean(KEY);

let initialized = false;

/**
 * Initialise PostHog once. Safe to call repeatedly (it no-ops after the first
 * init). Used from the client-side provider component.
 */
export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!KEY || initialized) return;

  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // we send pageviews manually in the provider
    capture_pageleave: true,
  });
  initialized = true;
}

/** The configured PostHog instance (or an inert stub when not configured). */
export function getPostHog() {
  return posthog;
}
