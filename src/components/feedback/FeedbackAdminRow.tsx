"use client";

import { useTransition, type FormEvent } from "react";
import {
  deleteFeedbackAdminAction,
  setFeedbackCompletedAction,
} from "@/app/(app)/server-actions/feedback-admin";
import { TrashIcon } from "@/components/icons/LabeledIcons";

type Row = {
  id: string;
  message: string;
  display_name: string | null;
  user_email: string | null;
  /** Pre-formatted on the server (fixed locale) to avoid hydration mismatch. */
  submittedAtLabel: string;
  completed: boolean;
};

export function FeedbackAdminRow({ row }: { row: Row }) {
  const [pending, startTransition] = useTransition();

  function onDelete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!window.confirm("Delete this feedback?")) return;
    startTransition(() => {
      void deleteFeedbackAdminAction(new FormData(e.currentTarget));
    });
  }

  return (
    <li className="relative rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 pr-10">
      <form onSubmit={onDelete} className="absolute right-2 top-2">
        <input type="hidden" name="id" value={row.id} />
        <button
          type="submit"
          disabled={pending}
          title="Delete"
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
          aria-label="Delete feedback"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </form>

      <p className="whitespace-pre-wrap pr-6 text-sm text-zinc-200 sm:pr-0">
        {row.message}
      </p>

      <div className="mt-3 grid gap-1.5 text-xs text-zinc-500 sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <span className="text-zinc-600">Display name</span>
        <span className="text-zinc-300">
          {row.display_name?.trim() || "—"}
        </span>
        <span className="text-zinc-600">Email</span>
        <span className="text-zinc-300">
          {row.user_email ? (
            <span className="break-all">{row.user_email}</span>
          ) : (
            "—"
          )}
        </span>
        <span className="text-zinc-600">Submitted</span>
        <span className="text-zinc-300">{row.submittedAtLabel}</span>
      </div>

      <div className="mt-3 border-t border-zinc-800/80 pt-3">
        <form action={setFeedbackCompletedAction}>
          <input type="hidden" name="id" value={row.id} />
          <input
            type="hidden"
            name="completed"
            value={row.completed ? "false" : "true"}
          />
          <button
            type="submit"
            disabled={pending}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              row.completed
                ? "border-emerald-700/80 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-950/70"
                : "border-zinc-700 bg-zinc-950/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            Completed
          </button>
        </form>
      </div>
    </li>
  );
}
