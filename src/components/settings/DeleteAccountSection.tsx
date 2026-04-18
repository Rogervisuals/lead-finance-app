"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { deleteAccountAction } from "@/app/(app)/server-actions/delete-account";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Copy = {
  title: string;
  intro: string;
  listItem1: string;
  listItem2: string;
  listItem3: string;
  listItem4: string;
  confirmLabel: string;
  confirmHint: string;
  button: string;
  deleting: string;
  errors: Record<string, string>;
};

function mapError(code: string | undefined, copy: Copy["errors"]): string | null {
  if (!code) return null;
  return copy[code] ?? copy.UNKNOWN;
}

export function DeleteAccountSection({ copy }: { copy: Copy }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const signedOut = useRef(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(() => {
      void deleteAccountAction(undefined, fd).then((result) => {
        if (result.ok) {
          if (signedOut.current) return;
          signedOut.current = true;
          void (async () => {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signOut();
            window.location.assign("/login?deleted=1");
          })();
          return;
        }
        setError(mapError(result.error, copy.errors));
      });
    });
  }

  return (
    <div className="rounded-xl border border-rose-950/50 bg-rose-950/[0.12] p-5 sm:p-6">
      <h3 className="text-base font-semibold tracking-tight text-rose-100">{copy.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{copy.intro}</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400 marker:text-zinc-600">
        <li>{copy.listItem1}</li>
        <li>{copy.listItem2}</li>
        <li>{copy.listItem3}</li>
        <li>{copy.listItem4}</li>
      </ul>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 border-t border-rose-950/40 pt-6">
        <label className="block">
          <span className="text-sm font-medium text-zinc-200">{copy.confirmLabel}</span>
          <p className="mt-1 text-xs text-zinc-500">{copy.confirmHint}</p>
          <input
            name="confirm"
            type="text"
            autoComplete="off"
            placeholder="DELETE"
            disabled={pending}
            className="mt-2 w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-rose-700/80 focus:ring-2 focus:ring-rose-600/25 disabled:opacity-60"
          />
        </label>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-4 py-2.5 text-sm font-semibold text-rose-100 transition-colors hover:border-rose-800 hover:bg-rose-950/70 disabled:opacity-50"
        >
          {pending ? copy.deleting : copy.button}
        </button>
      </form>
    </div>
  );
}
