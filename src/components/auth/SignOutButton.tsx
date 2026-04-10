"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({
  variant = "default",
  className = "",
  signOutLabel = "Sign out",
  signingOutLabel = "Signing out...",
}: {
  variant?: "default" | "menu";
  className?: string;
  signOutLabel?: string;
  signingOutLabel?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const base =
    variant === "menu"
      ? "w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
      : "rounded-md border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`${base} ${className}`.trim()}
    >
      {loading ? signingOutLabel : signOutLabel}
    </button>
  );
}

