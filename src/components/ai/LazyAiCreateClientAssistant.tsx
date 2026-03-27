"use client";

import dynamic from "next/dynamic";

const AiCreateClientAssistant = dynamic(
  () => import("@/components/ai/AiCreateClientAssistant").then((m) => m.AiCreateClientAssistant),
  {
    ssr: false,
  }
);

export function LazyAiCreateClientAssistant() {
  return <AiCreateClientAssistant />;
}
