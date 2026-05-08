"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export const FEEDBACK_POPUP_STORAGE_KEY = "feedback_popup_seen";

/** Default: submit form. `/feedback` is admin-only. */
const DEFAULT_FEEDBACK_HREF = "/feedback/submit";

type FeedbackPopupProps = {
  /** When false, the popup never schedules (e.g. match “Send feedback” nav visibility). */
  enabled?: boolean;
  /** Primary action target; defaults to public submit page. */
  feedbackHref?: string;
};

export function FeedbackPopup({
  enabled = true,
  feedbackHref = DEFAULT_FEEDBACK_HREF,
}: FeedbackPopupProps) {
  const [show, setShow] = useState(false);
  const [entered, setEntered] = useState(false);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(FEEDBACK_POPUP_STORAGE_KEY, "true");
    } catch {
      /* private mode / quota */
    }
    setEntered(false);
    setShow(false);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    try {
      if (localStorage.getItem(FEEDBACK_POPUP_STORAGE_KEY) === "true") return;
    } catch {
      return;
    }

    const delayMs = 5000 + Math.floor(Math.random() * 2001);
    const id = window.setTimeout(() => {
      try {
        if (localStorage.getItem(FEEDBACK_POPUP_STORAGE_KEY) === "true") return;
      } catch {
        return;
      }
      const path = window.location.pathname;
      if (path.startsWith("/feedback")) return;
      setShow(true);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [enabled]);

  useEffect(() => {
    if (!show) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="feedback-popup-title"
      aria-describedby="feedback-popup-desc"
      className={`pointer-events-auto fixed bottom-4 right-4 z-40 w-[min(100vw-2rem,20rem)] rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-4 shadow-xl shadow-black/40 backdrop-blur-sm transition-all duration-300 ease-out motion-reduce:transition-none ${
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        aria-label="Close"
      >
        <span className="block text-lg leading-none" aria-hidden>
          ×
        </span>
      </button>

      <h2
        id="feedback-popup-title"
        className="pr-8 text-sm font-semibold text-zinc-100"
      >
        Quick note 👋
      </h2>
      <p
        id="feedback-popup-desc"
        className="mt-2 text-xs leading-relaxed text-zinc-400"
      >
        I&apos;m actively improving this app every day. Got feedback or missing
        something? Let me know.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={feedbackHref}
          onClick={dismiss}
          className="inline-flex flex-1 min-w-[6.5rem] items-center justify-center rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 sm:flex-initial"
        >
          Give feedback
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex flex-1 min-w-[6.5rem] items-center justify-center rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80 sm:flex-initial"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
