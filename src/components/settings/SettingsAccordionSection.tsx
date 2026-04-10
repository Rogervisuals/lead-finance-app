"use client";

import type { ReactNode } from "react";

export function SettingsAccordionSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-zinc-800/70 last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-base font-semibold text-zinc-100 hover:bg-zinc-950/40 sm:px-10 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span
          className="select-none text-zinc-500 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        >
          ▾
        </span>
      </summary>
      <div className="px-6 pb-8 pt-2 sm:px-10">{children}</div>
    </details>
  );
}
