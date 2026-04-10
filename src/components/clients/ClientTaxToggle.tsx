"use client";

import { useTransition } from "react";
import { updateClientTaxEnabledAction } from "@/app/(app)/server-actions/clients";

export function ClientTaxToggle({
  clientId,
  defaultChecked,
}: {
  clientId: string;
  defaultChecked: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form action={updateClientTaxEnabledAction}>
      <input type="hidden" name="client_id" value={clientId} />
      <input
        type="hidden"
        name="return_to"
        value={`/clients/${clientId}`}
      />
      <input type="hidden" name="tax_enabled" value="false" />
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          name="tax_enabled"
          value="true"
          defaultChecked={defaultChecked}
          disabled={pending}
          className="peer sr-only"
          onChange={(e) => {
            const form = e.currentTarget.form;
            if (form) startTransition(() => form.requestSubmit());
          }}
        />
        <span className="h-7 w-14 rounded-full border border-zinc-800 bg-zinc-900/30 transition-all duration-300 peer-checked:bg-zinc-100 peer-disabled:opacity-50" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-zinc-100 shadow transition-all duration-300 peer-checked:translate-x-7 peer-checked:bg-zinc-950 peer-disabled:opacity-50" />
      </label>
    </form>
  );
}
