import { fetchFxRateFromProviders } from "@/lib/finance/exchange-rate";
import { roundMoney } from "@/lib/finance/income-currency";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

type Supabase = ReturnType<typeof createSupabaseServerActionClient>;

/**
 * Recompute amount_converted / exchange_rate for all income and expense rows
 * after the account base currency changes.
 */
export async function recomputeStoredAmountsForBaseCurrency(
  supabase: Supabase,
  userId: string,
  base: string
): Promise<boolean> {
  async function recomputeTable(table: "income" | "expenses" | "business_expenses") {
    const { data: curRows } = await supabase
      .from(table)
      .select("currency")
      .eq("user_id", userId);

    const distinct = Array.from(
      new Set((curRows ?? []).map((r: { currency?: string | null }) =>
        String(r.currency ?? "").trim().toUpperCase()
      ))
    ).filter(Boolean);

    for (const entryCurrency of distinct) {
      if (entryCurrency === base) {
        const { data: rows } = await supabase
          .from(table)
          .select("id,amount_original")
          .eq("user_id", userId)
          .eq("currency", entryCurrency);

        for (const r of rows ?? []) {
          const id = (r as { id: string }).id;
          const amtOrig = Number((r as { amount_original?: number }).amount_original ?? 0);
          await supabase
            .from(table)
            .update({
              exchange_rate: 1,
              amount_converted: roundMoney(amtOrig),
            })
            .eq("id", id)
            .eq("user_id", userId);
        }
        continue;
      }

      const rate = await fetchFxRateFromProviders(entryCurrency, base);
      if (rate == null || !Number.isFinite(rate) || rate <= 0) {
        return false;
      }

      const { data: rows } = await supabase
        .from(table)
        .select("id,amount_original")
        .eq("user_id", userId)
        .eq("currency", entryCurrency);

      for (const r of rows ?? []) {
        const id = (r as { id: string }).id;
        const amtOrig = Number((r as { amount_original?: number }).amount_original ?? 0);
        await supabase
          .from(table)
          .update({
            exchange_rate: rate,
            amount_converted: roundMoney(amtOrig * rate),
          })
          .eq("id", id)
          .eq("user_id", userId);
      }
    }

    return true;
  }

  const ok = await recomputeTable("income");
  const ok2 = await recomputeTable("expenses");
  const ok3 = await recomputeTable("business_expenses");
  return ok && ok2 && ok3;
}
