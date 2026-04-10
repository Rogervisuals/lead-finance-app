"use client";

import dynamic from "next/dynamic";

/**
 * Non-critical app chrome: prefetch, FX cache warm, and feedback FAB are deferred
 * so the main layout + page JS parse first (smaller initial bundle for LCP).
 */
const FxCachePrewarm = dynamic(
  () => import("@/components/finance/FxCachePrewarm").then((m) => m.FxCachePrewarm),
  { ssr: false }
);

const RoutePrefetcher = dynamic(
  () => import("@/components/nav/RoutePrefetcher").then((m) => m.RoutePrefetcher),
  { ssr: false }
);

const FeedbackFloatingButton = dynamic(
  () =>
    import("@/components/feedback/FeedbackFloatingButton").then(
      (m) => m.FeedbackFloatingButton
    ),
  { ssr: false }
);

export function AppDeferredFeatures({
  enableLinkPrefetch,
}: {
  enableLinkPrefetch: boolean;
}) {
  return (
    <>
      <FxCachePrewarm />
      {enableLinkPrefetch ? <RoutePrefetcher /> : null}
      <FeedbackFloatingButton />
    </>
  );
}
