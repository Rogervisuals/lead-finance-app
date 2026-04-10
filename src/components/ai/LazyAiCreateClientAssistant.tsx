"use client";

import dynamic from "next/dynamic";

const AiCreateClientAssistant = dynamic(
  () =>
    import("@/components/ai/AiCreateClientAssistant").then(
      (m) => m.AiCreateClientAssistant
    )
);

export function LazyAiCreateClientAssistant({
  canUseAi,
}: {
  /** False on Free plan: button stays visible but modal explains upgrade (no API calls). */
  canUseAi: boolean;
}) {
  return <AiCreateClientAssistant canUseAi={canUseAi} />;
}
