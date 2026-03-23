"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { submitFeedbackAction } from "@/app/(app)/server-actions/feedback";

/**
 * Outer shell uses pointer-events-none so it never steals clicks from the page.
 * Only the Feedback control and the open modal use pointer-events-auto.
 */
export function FeedbackFloatingButton() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [showSentToast, setShowSentToast] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "ok"; text: string } | { type: "err"; text: string } | null
  >(null);

  useEffect(() => {
    if (!isFeedbackOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFeedbackOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFeedbackOpen]);

  useEffect(() => {
    if (!showSentToast) return;
    const id = window.setTimeout(() => setShowSentToast(false), 2200);
    return () => window.clearTimeout(id);
  }, [showSentToast]);

  function openFeedback() {
    console.log("[Feedback] button clicked — opening modal");
    setModalKey((k) => k + 1);
    setFeedback(null);
    setIsFeedbackOpen(true);
  }

  function closeFeedback() {
    setIsFeedbackOpen(false);
    setFeedback(null);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setFeedback(null);
    startTransition(async () => {
      const result = await submitFeedbackAction(fd);
      if (result.ok) {
        console.log("[Feedback] submitted successfully — closing modal");
        form.reset();
        closeFeedback();
        setShowSentToast(true);
      } else {
        setFeedback({ type: "err", text: result.error });
      }
    });
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {/* Clickable hit area for the floating button only */}
      <div className="pointer-events-auto absolute bottom-5 right-5">
        <button
          type="button"
          onClick={openFeedback}
          className="rounded-full border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur transition-colors hover:border-sky-700 hover:bg-zinc-800 hover:text-white"
        >
          Feedback
        </button>
      </div>

      {showSentToast ? (
        <div className="pointer-events-none fixed bottom-20 right-5 z-[202]">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-800/70 bg-emerald-950/90 px-3 py-2 text-sm text-emerald-200 shadow-lg">
            <span aria-hidden className="text-emerald-300">
              ✅
            </span>
            <span>Feedback sent</span>
          </div>
        </div>
      ) : null}

      {isFeedbackOpen ? (
        <div className="pointer-events-auto fixed inset-0 z-[201] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm"
            onClick={closeFeedback}
          />
          <div
            key={modalKey}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="feedback-title"
              className="text-base font-semibold text-zinc-100"
            >
              Send feedback
            </h2>
            <form onSubmit={onSubmit} className="mt-3 space-y-3">
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Your thoughts, bugs, ideas…"
                disabled={pending}
                className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-600 disabled:opacity-60"
              />
              {feedback?.type === "err" ? (
                <p className="text-sm text-rose-400">{feedback.text}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {pending ? "Sending…" : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={closeFeedback}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
