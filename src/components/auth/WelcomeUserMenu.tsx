"use client";

import { SignOutButton } from "@/components/auth/SignOutButton";

export function WelcomeUserMenu({ displayName }: { displayName: string }) {
  return (
    <div className="group relative hidden md:block">
      <div className="flex cursor-default items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white">
        <span>
          Welcome {displayName}
        </span>
        <span className="text-xs text-zinc-500 group-hover:text-zinc-400" aria-hidden>
          ▾
        </span>
      </div>
      <div className="pointer-events-none absolute right-0 top-full z-30 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="w-44 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-lg">
          <SignOutButton variant="menu" />
        </div>
      </div>
    </div>
  );
}
