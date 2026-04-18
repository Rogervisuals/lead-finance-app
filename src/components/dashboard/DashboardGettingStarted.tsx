"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { config } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faLock } from "@fortawesome/free-solid-svg-icons";
import type { GettingStartedItem } from "@/lib/dashboard-getting-started";

config.autoAddCss = false;

/** Set when leaving the dashboard after checklist was complete; hides the celebration on return (same tab session). */
const ALL_DONE_ACK_KEY = "lf_dashboard_getting_started_ack";

type LabelMap = Record<string, string>;

export function DashboardGettingStarted({
  progressDone,
  progressTotal,
  allDone,
  items,
  labels,
  title,
  progressTemplate,
  allDoneTitle,
  allDoneBody,
  upgradeLabel,
}: {
  progressDone: number;
  progressTotal: number;
  allDone: boolean;
  items: GettingStartedItem[];
  labels: LabelMap;
  title: string;
  /** Use "{{done}}" and "{{total}}" placeholders. */
  progressTemplate: string;
  allDoneTitle: string;
  allDoneBody: string;
  upgradeLabel: string;
}) {
  const progressLabel = progressTemplate
    .replace("{{done}}", String(progressDone))
    .replace("{{total}}", String(progressTotal));

  const pct =
    progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [allDoneDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(ALL_DONE_ACK_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Clear a timer from a previous unmount so React Strict Mode remount does not persist a false "left dashboard".
    if (dismissTimerRef.current !== undefined) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = undefined;
    }
    return () => {
      if (!allDone) return;
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = undefined;
        try {
          sessionStorage.setItem(ALL_DONE_ACK_KEY, "1");
        } catch {
          /* ignore quota / private mode */
        }
      }, 200);
    };
  }, [allDone]);

  if (allDone && allDoneDismissed) {
    return null;
  }

  const innerBody = allDone ? (
    <div
      className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-5 sm:px-5"
      aria-label={allDoneTitle}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-800/60 bg-emerald-950/50 text-lg text-emerald-300"
          aria-hidden
        >
          ✓
        </span>
        <div>
          <h2 className="text-base font-semibold text-zinc-50">{allDoneTitle}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{allDoneBody}</p>
        </div>
      </div>
    </div>
  ) : (
    <>
      <div className="max-w-md">
        <div
          className="h-2 overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuenow={progressDone}
          aria-valuemin={0}
          aria-valuemax={progressTotal}
          aria-label={progressLabel}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-600 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-1">
        {items.map((item) => {
          const label = labels[item.id] ?? item.id;
          if (item.locked) {
            return (
              <li key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-900/50 bg-amber-950/30 text-amber-500/90"
                      aria-hidden
                    >
                      <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm text-zinc-500">{label}</span>
                  </div>
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-md border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:border-amber-600 hover:bg-amber-950/60"
                  >
                    {upgradeLabel}
                  </Link>
                </div>
              </li>
            );
          }

          if (item.completed) {
            return (
              <li key={item.id}>
                <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-500">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-900/40 bg-emerald-950/20 text-emerald-500/90"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{label}</span>
                </div>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800/60 hover:text-white"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/50 text-xs font-medium text-zinc-500"
                  aria-hidden
                >
                  ○
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <details
      className="open:[&_.gs-chevron]:rotate-180 rounded-xl border border-zinc-800 bg-zinc-900/30 open:border-zinc-700"
      aria-labelledby="getting-started-heading"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 text-left">
          <h2
            id="getting-started-heading"
            className="text-base font-semibold text-zinc-100"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">{progressLabel}</p>
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="gs-chevron h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200"
          aria-hidden
        />
      </summary>
      <div className="border-t border-zinc-800/80 px-4 pb-5 pt-4 sm:px-6">{innerBody}</div>
    </details>
  );
}
