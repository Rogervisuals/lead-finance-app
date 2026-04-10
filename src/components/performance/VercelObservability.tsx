"use client";

import dynamic from "next/dynamic";

/**
 * Loads Vercel Analytics + Speed Insights only on the client after hydration so they
 * are not in the critical path for FCP/LCP (third-party scripts deferred via next/dynamic).
 */
const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false }
);

export function VercelObservability() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
