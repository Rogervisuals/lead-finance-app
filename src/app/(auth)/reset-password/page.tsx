"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function normalizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("password should contain at least one character of each")) {
    return "Password should contain at least one uppercase, lowercase, digit and symbol.";
  }
  return message;
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const syncRecoverySessionState = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsRecoverySession(Boolean(session));
      setRecoveryEmail(session?.user?.email ?? "");
      return Boolean(session);
    };

    const clearUrlTokens = () => {
      window.history.replaceState({}, document.title, "/reset-password");
    };

    const applyRecoveryHash = async (): Promise<boolean> => {
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const type = params.get("type");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (type !== "recovery" || !accessToken || !refreshToken) return false;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return false;

      const ok = await syncRecoverySessionState();
      if (ok) {
        clearUrlTokens();
      }
      return ok;
    };

    const applyRecoveryCode = async (): Promise<boolean> => {
      const params = new URLSearchParams(window.location.search);
      const type = params.get("type");
      const code = params.get("code");
      if (type !== "recovery" || !code) return false;

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return false;

      const ok = await syncRecoverySessionState();
      if (ok) {
        clearUrlTokens();
      }
      return ok;
    };

    const applyRecoveryTokenHash = async (): Promise<boolean> => {
      const params = new URLSearchParams(window.location.search);
      const type = params.get("type");
      const tokenHash = params.get("token_hash");
      if (type !== "recovery" || !tokenHash) return false;

      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });
      if (error) return false;

      const ok = await syncRecoverySessionState();
      if (ok) {
        clearUrlTokens();
      }
      return ok;
    };

    void (async () => {
      const hash = window.location.hash.replace(/^#/, "");
      const search = new URLSearchParams(window.location.search);
      const hasRecoveryTokens =
        (hash.includes("type=recovery") && hash.includes("access_token=")) ||
        (search.get("type") === "recovery" &&
          (Boolean(search.get("code")) || Boolean(search.get("token_hash"))));

      // If we are opening a recovery link, ensure any existing session does not override it.
      if (hasRecoveryTokens) {
        await supabase.auth.signOut({ scope: "local" });
      }

      let recovered = false;
      if (hasRecoveryTokens) {
        recovered = await applyRecoveryHash();
        if (!recovered) recovered = await applyRecoveryCode();
        if (!recovered) recovered = await applyRecoveryTokenHash();
      }

      if (!recovered) {
        // Do not treat a normal logged-in session as a recovery session.
        setIsRecoverySession(false);
        setRecoveryEmail("");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsRecoverySession(Boolean(session));
        setRecoveryEmail(session?.user?.email ?? "");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setRequestLoading(true);

    const supabase = createSupabaseBrowserClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setRequestLoading(false);
      return;
    }

    setMessage("We sent you a reset link by email.");
    setRequestLoading(false);
  }

  async function onSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaveLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("Recovery session expired. Request a new reset link and try again.");
      setSaveLoading(false);
      setIsRecoverySession(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(normalizeAuthError(error.message));
      setSaveLoading(false);
      return;
    }

    setMessage("Password updated. You can now sign in with your new password.");
    setNewPassword("");
    setSaveLoading(false);
  }

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h1 className="mb-2 text-xl font-semibold">Reset password</h1>
      <p className="mb-5 text-sm text-zinc-400">
        {isRecoverySession
          ? "Choose a new password for your account."
          : "Enter your email and we will send you a reset link."}
      </p>

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

      {isRecoverySession ? (
        <form onSubmit={onSavePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-300" htmlFor="recovery-email">
              Account email
            </label>
            <input
              id="recovery-email"
              type="email"
              value={recoveryEmail}
              disabled
              className="w-full cursor-not-allowed rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-300" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saveLoading}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={saveLoading}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {saveLoading ? "Saving..." : "Save new password"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSendReset} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={requestLoading}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={requestLoading}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {requestLoading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-zinc-400">
        Back to{" "}
        <Link className="text-sky-400 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
