import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientProjectSelect } from "@/components/forms/ClientProjectSelect";
import { IncomeCurrencyFields } from "@/components/forms/IncomeCurrencyFields";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import {
  deleteExpenseAction,
  updateExpenseAction,
} from "../../../server-actions/expenses";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: expense }, { data: clients }, { data: projects }, settings] =
    await Promise.all([
      supabase
        .from("expenses")
        .select(
          "id,client_id,project_id,date,amount_original,currency,exchange_rate,amount_converted,category,description"
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

  if (!expense) redirect("/expenses");

  const baseCurrency = settings.base_currency;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit expense</h1>
        <p className="mt-1 text-sm text-zinc-400">Update details for this entry.</p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        {searchParams?.error === "exchange_rate" ? (
          <div className="mb-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            Enter a positive exchange rate when the currency differs from your base
            currency ({baseCurrency}).
          </div>
        ) : null}
        <form action={updateExpenseAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={expense.id} />

          <ClientProjectSelect
            clients={(clients ?? []) as any}
            projects={(projects ?? []) as any}
            initialClientId={expense.client_id ?? undefined}
            initialProjectId={expense.project_id ?? ""}
          />

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Date *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                required
                name="date"
                type="date"
                defaultValue={expense.date ?? ""}
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <IncomeCurrencyFields
            baseCurrency={baseCurrency}
            defaultCurrency={expense.currency ?? "EUR"}
            defaultAmountOriginal={expense.amount_original ?? 0}
            defaultExchangeRate={expense.exchange_rate ?? 1}
          />

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Category</span>
            <input
              name="category"
              defaultValue={expense.category ?? "General"}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Description</span>
            <input
              name="description"
              defaultValue={expense.description ?? ""}
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

        <form action={deleteExpenseAction} className="mt-4">
          <input type="hidden" name="id" value={expense.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
          >
            Delete expense
          </button>
        </form>
      </section>
    </div>
  );
}

