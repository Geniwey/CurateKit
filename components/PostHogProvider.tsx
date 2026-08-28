"use client";

/**
 * PostHog provider — wraps the app and auto-tracks pageviews.
 *
 * When NEXT_PUBLIC_POSTHOG_KEY is not configured this renders its children
 * unchanged, so analytics is completely optional.
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { initPostHog, isPostHogConfigured, getPostHog } from "@/lib/analytics";

// Initialise as soon as this module loads on the client.
if (isPostHogConfigured) {
  initPostHog();
}

/** Tracks a $pageview event whenever the route changes. */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { url });
  }, [pathname, searchParams, posthog]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPostHogConfigured) return <>{children}</>;

  return (
    <PHProvider client={getPostHog()}>
      <PageViewTracker />
      {children}
    </PHProvider>
  );
}
