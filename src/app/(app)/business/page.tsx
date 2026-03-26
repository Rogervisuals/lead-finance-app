import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CurrencyWithUsd } from "@/components/display/CurrencyWithUsd";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";

export const dynamic = "force-dynamic";

const MILEAGE_COST_PER_KM_EUR = 0.5;

function sumNumbers(rows: Array<{ value: number | string | null | undefined }> | any[]) {
  return (rows ?? []).reduce((acc: number, r: any) => {
    const v = typeof r === "number" ? r : Number(r.value ?? r.amount ?? 0);
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);
}

export default async function BusinessOverviewPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: expenseRows }, { data: mileageRows }, settings] =
    await Promise.all([
      supabase
        .from("business_expenses")
        .select("amount")
        .eq("user_id", user.id),
      supabase
        .from("mileage")
        .select("distance_km")
        .eq("user_id", user.id),
      getOrCreateUserFinancialSettings(user.id),
    ]);

  const totalExpenses = sumNumbers(
    (expenseRows ?? []).map((r: any) => ({ value: r.amount }))
  );

  const totalMileageKm = sumNumbers(
    (mileageRows ?? []).map((r: any) => ({ value: r.distance_km }))
  );

  const totalMileageCost = totalMileageKm * MILEAGE_COST_PER_KM_EUR;
  const baseCurrency = settings.base_currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Business</h1>
          <p className="mt-1 text-sm text-zinc-400">
            General expenses and mileage.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/business/general-expenses"
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            General expenses
          </Link>
          <Link
            href="/business/mileage"
            className="rounded-md border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
          >
            Mileage
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total business expenses</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={totalExpenses}
              currency={baseCurrency}
              primaryClassName="text-3xl font-semibold text-emerald-300"
              usdClassName="mt-1 text-sm tabular-nums text-emerald-200/75"
            />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">
            Total mileage cost{" "}
            <span className="text-zinc-500">
              ({MILEAGE_COST_PER_KM_EUR.toFixed(2)} EUR/km)
            </span>
          </div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={totalMileageCost}
              currency="EUR"
              primaryClassName="text-3xl font-semibold text-sky-300"
              usdClassName="mt-1 text-sm tabular-nums text-sky-200/75"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

