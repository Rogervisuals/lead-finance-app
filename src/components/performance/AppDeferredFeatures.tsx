"use client";

import dynamic from "next/dynamic";

/**
 * Non-critical app chrome: prefetch and FX cache warm are deferred so the main
 * layout + page JS parse first (smaller initial bundle for LCP).
 */
const FxCachePrewarm = dynamic(
  () => import("@/components/finance/FxCachePrewarm").then((m) => m.FxCachePrewarm),
  { ssr: false }
);

const RoutePrefetcher = dynamic(
  () => import("@/components/nav/RoutePrefetcher").then((m) => m.RoutePrefetcher),
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
    </>
  );
}
