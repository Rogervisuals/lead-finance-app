"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { submitFeedbackAction } from "@/app/(app)/server-actions/feedback";

type Copy = {
  messagePlaceholder: string;
  submitButton: string;
  sending: string;
  successTitle: string;
  successBody: string;
  returnToDashboard: string;
  sendAnother: string;
};

export function FeedbackSubmitForm({ copy }: { copy: Copy }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await submitFeedbackAction(fd);
      if (result.ok) {
        form.reset();
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/25 px-4 py-3">
          <p className="text-sm font-medium text-emerald-200">{copy.successTitle}</p>
          <p className="mt-1 text-sm text-emerald-100/90">{copy.successBody}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDone(false)}
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            {copy.sendAnother}
          </button>
          <Link
            href="/dashboard"
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {copy.returnToDashboard}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <textarea
        name="message"
        required
        rows={6}
        placeholder={copy.messagePlaceholder}
        disabled={pending}
        className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-600 disabled:opacity-60"
      />
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? copy.sending : copy.submitButton}
      </button>
    </form>
  );
}
