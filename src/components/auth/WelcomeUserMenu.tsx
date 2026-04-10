"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";
import type { ThemeMode } from "@/lib/theme";
import type { FullUi } from "@/lib/i18n/get-ui";

export function WelcomeUserMenu({
  displayName,
  serverTheme,
  showAdminFeedback = false,
  ui,
}: {
  displayName: string;
  serverTheme: ThemeMode;
  showAdminFeedback?: boolean;
  ui: FullUi;
}) {
  return (
    <div className="group relative hidden md:block">
      <div className="flex cursor-default items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white">
        <span>
          {ui.nav.welcome} {displayName}
        </span>
        <span className="text-xs text-zinc-500 group-hover:text-zinc-400" aria-hidden>
          ▾
        </span>
      </div>
      <div className="pointer-events-none absolute right-0 top-full z-30 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="w-56 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-lg">
          <Link
            href="/profile"
            className="block rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
          >
            {ui.nav.profile}
          </Link>
          <Link
            href="/settings"
            className="block rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
          >
            {ui.nav.settings}
          </Link>

          <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
            <span className="text-zinc-300">{ui.nav.theme}</span>
            <ThemeSwitch serverTheme={serverTheme} />
          </div>

          {showAdminFeedback ? (
            <Link
              href="/feedback"
              className="block rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
            >
              {ui.nav.feedback}
            </Link>
          ) : null}
          <SignOutButton
            variant="menu"
            signOutLabel={ui.auth.signOut}
            signingOutLabel={ui.auth.signingOut}
          />
        </div>
      </div>
    </div>
  );
}
