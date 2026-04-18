import { DeleteLabel } from "@/components/icons/LabeledIcons";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientProjectSelect } from "@/components/forms/ClientProjectSelect";
import { IncomeCurrencyFields } from "@/components/forms/IncomeCurrencyFields";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import {
  deleteIncomeAction,
  updateIncomeAction,
} from "../../../server-actions/income";

export const dynamic = "force-dynamic";

export default async function EditIncomePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: income }, { data: clients }, { data: projects }, settings] =
    await Promise.all([
      supabase
        .from("income")
        .select(
          "id,client_id,project_id,date,amount_original,currency,exchange_rate,amount_converted,description"
        )
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("clients")
        .select("id,name")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("projects")
        .select("id,name,client_id")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      getOrCreateUserFinancialSettings(user.id),
    ]);

  if (!income) redirect("/income");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit income</h1>
        <p className="mt-1 text-sm text-zinc-400">Update details for this entry.</p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form action={updateIncomeAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={income.id} />

          <ClientProjectSelect
            clients={(clients ?? []) as any}
            projects={(projects ?? []) as any}
            initialClientId={income.client_id ?? undefined}
            initialProjectId={income.project_id ?? ""}
          />

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Date *</span>
            <input
              required
              name="date"
              type="date"
              defaultValue={income.date ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <IncomeCurrencyFields
            baseCurrency={settings.base_currency}
            defaultCurrency={income.currency ?? "EUR"}
            defaultAmountOriginal={income.amount_original ?? 0}
            defaultExchangeRate={income.exchange_rate ?? 1}
          />

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Description</span>
            <input
              name="description"
              defaultValue={income.description ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Save changes
            </button>
          </div>
        </form>


      </section>
    </div>
  );
}

