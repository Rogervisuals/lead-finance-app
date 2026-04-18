"use client";

import { useFormStatus } from "react-dom";
import { updateClientTaxEnabledAction } from "@/app/(app)/server-actions/clients";

function VatToggleButton({ defaultChecked }: { defaultChecked: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title={defaultChecked ? "Turn off" : "Turn on"}
      className={[
        "inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50",
        defaultChecked
          ? "border-emerald-700/80 bg-emerald-950/50 text-emerald-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-emerald-900/45 focus-visible:ring-emerald-500/80"
          : "border-red-800/90 bg-red-950/45 text-red-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:bg-red-950/65 focus-visible:ring-red-500/70",
      ].join(" ")}
    >
      <span>TAX</span>
      <span
        className={
          defaultChecked
            ? "text-[11px] font-medium uppercase text-emerald-200/90"
            : "text-[11px] font-medium uppercase text-red-200/90"
        }
      >
        {defaultChecked ? "On" : "Off"}
      </span>
    </button>
  );
}

export function ClientTaxToggle({
  clientId,
  defaultChecked,
}: {
  clientId: string;
  defaultChecked: boolean;
}) {
  /** Next value after click (server applies this as the new tax_enabled). */
  const nextValue = defaultChecked ? "false" : "true";

  return (
    <form action={updateClientTaxEnabledAction}>
      <input type="hidden" name="client_id" value={clientId} />
      <input
        type="hidden"
        name="return_to"
        value={`/clients/${clientId}`}
      />
      <input type="hidden" name="tax_enabled" value={nextValue} />
      <VatToggleButton defaultChecked={defaultChecked} />
    </form>
  );
}
