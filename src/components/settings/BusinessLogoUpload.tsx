"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import {
  removeInvoiceLogoAction,
  uploadInvoiceLogoAction,
} from "@/app/(app)/server-actions/invoice-logo";

function PendingText({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? busy : idle}</>;
}

export function BusinessLogoUpload({
  initialLogoUrl,
  returnTo,
}: {
  initialLogoUrl: string | null;
  returnTo: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {initialLogoUrl ? (
          <div className="relative flex h-11 w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800 bg-white p-1.5">
            {/* next/image: explicit dimensions + remotePatterns (next.config) for Supabase Storage */}
            <Image
              src={initialLogoUrl}
              alt=""
              width={104}
              height={32}
              sizes="120px"
              className="max-h-8 w-auto max-w-[104px] object-contain"
            />
          </div>
        ) : (
          <div className="flex h-11 w-[120px] shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-800 bg-zinc-900/20 text-[11px] font-medium text-zinc-500">
            No logo
          </div>
        )}
        <p className="min-w-0 text-xs leading-relaxed text-zinc-500">
          PNG, JPEG, WebP, or GIF. Max 2&nbsp;MB. Used on invoice PDFs.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <form className="flex flex-wrap items-center gap-2" action={uploadInvoiceLogoAction}>
          <input type="hidden" name="return_to" value={returnTo} />
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            required
            className="max-w-[200px] text-xs text-zinc-400 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
          />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-950/40"
          >
            <PendingText idle="Upload" busy="…" />
          </button>
        </form>
        {initialLogoUrl ? (
          <form action={removeInvoiceLogoAction}>
            <input type="hidden" name="return_to" value={returnTo} />
            <button
              type="submit"
              className="rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-rose-400"
            >
              <PendingText idle="Remove" busy="…" />
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
