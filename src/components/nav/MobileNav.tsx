"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function MobileNav({
  displayName,
  showAdminFeedback = false,
}: {
  displayName: string;
  showAdminFeedback?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative z-[60] flex h-9 shrink-0 items-center md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/30 leading-none text-zinc-100 transition-colors hover:bg-zinc-900/50"
      >
        <span
          className={`absolute h-0.5 w-5 rounded bg-current transition-all duration-300 ${
            open ? "translate-y-0 rotate-45" : "-translate-y-1.5 rotate-0"
          }`}
        />
        <span
          className={`absolute h-0.5 w-5 rounded bg-current transition-all duration-300 ${
            open ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`absolute h-0.5 w-5 rounded bg-current transition-all duration-300 ${
            open ? "translate-y-0 -rotate-45" : "translate-y-1.5 rotate-0"
          }`}
        />
      </button>

      <div
        className={`absolute right-0 top-full z-[70] mt-3 w-64 origin-top-right overflow-hidden transition-all duration-300 ease-out ${
          open
            ? "pointer-events-auto max-h-[36rem] translate-y-0 scale-100 opacity-100"
            : "pointer-events-none max-h-0 -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-xl">
          <div
            className="cursor-default select-none border-b border-zinc-800/90 px-1 pb-3 pt-0.5"
            role="presentation"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Welcome
            </p>
            <p className="mt-1.5 truncate text-[15px] font-medium leading-snug text-zinc-100">
              {displayName}
            </p>
          </div>

          <div className="grid gap-1 text-sm">
            <MobileItem href="/dashboard">Dashboard</MobileItem>
            <MobileItem href="/clients">Clients</MobileItem>
            <MobileItem href="/projects">Projects</MobileItem>
          </div>

          <MobileDropdown title="Finance">
            <MobileItem href="/income">Income</MobileItem>
            <MobileItem href="/expenses">Expenses</MobileItem>
            <MobileItem href="/hours">Hours</MobileItem>
          </MobileDropdown>

          <MobileDropdown title="Business">
            <MobileItem href="/business/general-expenses">General expenses</MobileItem>
            <MobileItem href="/business/mileage">Mileage</MobileItem>
          </MobileDropdown>

          {showAdminFeedback ? (
            <div className="grid gap-1 text-sm">
              <MobileItem href="/feedback">Feedback</MobileItem>
            </div>
          ) : null}

          <div className="pt-1">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileDropdown({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-md border border-zinc-800 bg-zinc-950/30 p-2">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
        <span className="text-zinc-600">▾</span>
      </summary>
      <div className="mt-2 grid gap-1 text-sm">{children}</div>
    </details>
  );
}

function MobileItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1.5 text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white"
    >
      {children}
    </Link>
  );
}
