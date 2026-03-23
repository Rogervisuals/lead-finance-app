import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { updateFinancialSettingsAction } from "../../server-actions/settings";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const settings = await getOrCreateUserFinancialSettings(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configure VAT and tax. Base currency is fixed.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
        >
          Back
        </Link>
      </div>

      <section className="max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form action={updateFinancialSettingsAction} className="grid gap-3">
          <input type="hidden" name="return_to" value="/dashboard/settings" />

          <label className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2">
            <span className="text-sm text-zinc-200">VAT enabled</span>
            <input type="hidden" name="vat_enabled" value="false" />
            <input
              name="vat_enabled"
              type="checkbox"
              value="true"
              defaultChecked={settings.vat_enabled}
              className="h-4 w-4 accent-sky-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">VAT percentage</span>
            <input
              required
              name="vat_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={settings.vat_percentage}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Tax percentage</span>
            <input
              required
              name="tax_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={settings.tax_percentage}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-500">Base currency</span>
            <input
              readOnly
              type="text"
              defaultValue={settings.base_currency}
              tabIndex={-1}
              aria-readonly="true"
              className="w-full cursor-not-allowed rounded-md border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 text-sm uppercase text-zinc-500 outline-none"
            />
            <span className="text-xs text-zinc-600">
              Locked. Dashboard totals and converted income use this currency.
            </span>
          </label>

          <div className="pt-1">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Save settings
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
