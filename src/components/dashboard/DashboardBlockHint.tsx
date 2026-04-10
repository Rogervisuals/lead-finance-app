"use client";

import type { ReactNode } from "react";

/**
 * Small top-right hint control; explanation appears on hover (and stays while hovering the panel).
 */
export function DashboardBlockHint({ children }: { children: ReactNode }) {
  return (
    <div className="group/hint relative shrink-0">
      <button
        type="button"
        /*className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700/70 bg-zinc-900/60 text-zinc-500 outline-none transition-colors hover:border-zinc-600 hover:bg-zinc-800/70 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-sky-500/35"*/
        aria-label="About this metric"
      >
<svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
          />
        </svg>

      </button>
      <div
        role="tooltip"
        className="invisible absolute right-0 top-full z-50 mt-1.5 w-[min(18rem,calc(100vw-2.5rem))] rounded-lg border border-zinc-700/90 bg-zinc-950 px-3 py-2.5 text-left text-xs leading-relaxed text-zinc-300 shadow-xl opacity-0 ring-1 ring-black/20 transition-opacity duration-150 group-hover/hint:visible group-hover/hint:opacity-100 group-hover/hint:pointer-events-auto group-focus-within/hint:visible group-focus-within/hint:opacity-100 group-focus-within/hint:pointer-events-auto"
      >
        <div className="space-y-1.5 [&_a]:text-sky-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-sky-300">
          {children}
        </div>
      </div>
    </div>
  );
}
