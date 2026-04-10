"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FullUi } from "@/lib/i18n/get-ui";

function getFriendlySignupError(message: string, passwordHint: string): string {
  const m = message.toLowerCase();
  if (m.includes("password should contain at least one character of each")) {
    return passwordHint;
  }
  return message;
}

export function SignupForm({ copy }: { copy: FullUi["auth"] }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const trimmedName = displayName.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: trimmedName,
        },
      },
    });

    if (error) {
      setError(getFriendlySignupError(error.message, copy.passwordRulesHint));
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(copy.confirmationSent);
    setShowSuccessModal(true);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setLoading(false);
  }

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h1 className="mb-5 text-xl font-semibold">{copy.createAccountTitle}</h1>

      {error ? (
        <div className="mb-4 rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-md border border-sky-800 bg-sky-950/40 px-3 py-2 text-sm text-sky-200">
          {message}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-zinc-300" htmlFor="display_name">
            {copy.displayName}
          </label>
          <input
            id="display_name"
            type="text"
            required
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={copy.displayNamePlaceholder}
            disabled={loading || showSuccessModal}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>

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
            disabled={loading || showSuccessModal}
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
            disabled={loading || showSuccessModal}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || showSuccessModal}
          className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {loading ? copy.creating : copy.createAccount}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-400">
        {copy.haveAccount}{" "}
        <Link className="text-sky-400 hover:underline" href="/login">
          {copy.signIn}
        </Link>
      </p>

      {showSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={copy.closeModalAria}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-lg transition-all duration-200 ease-out">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-800/80 bg-sky-950/40 text-sky-300">
              ✉
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">{copy.checkEmailTitle}</h2>
            <p className="mt-2 text-sm text-zinc-300">{copy.checkEmailBody}</p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                {copy.gotIt}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
