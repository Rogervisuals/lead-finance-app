"use client";

import Link from "next/link";
import { config } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

config.autoAddCss = false;

export function DashboardDataExportPdfControl({
  href,
  canExport,
  label,
  lockedTitle,
}: {
  href: string;
  canExport: boolean;
  label: string;
  lockedTitle: string;
}) {
  if (canExport) {
    return (
      <Link
        href={href}
        className="rounded-md border border-zinc-700 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600 hover:bg-zinc-900"
      >
        {label}
      </Link>
    );
  }

  return (
    <div
      className="relative inline-flex cursor-not-allowed"
      title={lockedTitle}
      aria-label={`${label}. ${lockedTitle}`}
    >
      <span className="rounded-md border border-zinc-800/90 bg-zinc-950/25 px-3 py-2 text-sm text-zinc-500 opacity-80">
        {label}
      </span>
      <span className="pointer-events-none absolute -right-1.5 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-amber-500/95 shadow-md ring-2 ring-zinc-950">
        <FontAwesomeIcon icon={faLock} className="h-3 w-3" aria-hidden />
      </span>
    </div>
  );
}
