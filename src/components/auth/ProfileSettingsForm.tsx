"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ProfileSettingsForm({
  initialDisplayName,
  initialEmail,
}: {
  initialDisplayName: string;
  initialEmail: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    return (
      displayName.trim() !== initialDisplayName.trim() ||
      email.trim() !== initialEmail.trim() ||
      password.trim().length > 0
    );
  }, [displayName, initialDisplayName, email, initialEmail, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasChanges) {
      setSuccess("No changes to save.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const payload: {
      email?: string;
      password?: string;
      data?: { display_name?: string };
    } = {};

    if (displayName.trim() !== initialDisplayName.trim()) {
      payload.data = { display_name: displayName.trim() };
    }
    if (email.trim() !== initialEmail.trim()) {
      payload.email = email.trim();
    }
    if (password.trim()) {
      payload.password = password;
    }

    const { error } = await supabase.auth.updateUser(payload);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setPassword("");
    setSuccess(
      payload.email
        ? "Profile updated. Check your email to confirm address changes if required."
        : "Profile updated successfully."
    );
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="profile-display-name" className="text-sm text-zinc-300">
          Display name
        </label>
        <input
          id="profile-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-email" className="text-sm text-zinc-300">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-password" className="text-sm text-zinc-300">
          Password
        </label>
        <input
          id="profile-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          disabled={loading}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
