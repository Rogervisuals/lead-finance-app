"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FullUi } from "@/lib/i18n/get-ui";

export function LoginForm({ copy }: { copy: FullUi["auth"] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h1 className="mb-5 text-xl font-semibold">{copy.signInTitle}</h1>

      {error ? (
        <div className="mb-4 rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-zinc-300" htmlFor="email">
            {copy.email}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-zinc-300" htmlFor="password">
            {copy.password}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
          <div className="pt-1 text-right">
            <Link
              href="/reset-password"
              className="text-xs text-sky-400 hover:underline"
            >
              {copy.forgotPassword}
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {loading ? copy.signingIn : copy.signIn}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-400">
        {copy.noAccount}{" "}
        <Link className="text-sky-400 hover:underline" href="/signup">
          {copy.createOne}
        </Link>
      </p>
    </div>
  );
}
