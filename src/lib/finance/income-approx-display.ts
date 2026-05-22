import { fetchFxRate } from "@/lib/finance/exchange-rate";
import { normalizeSecondary } from "@/lib/finance/fx-display-currency";
import { roundMoney } from "@/lib/finance/income-currency";

/**
 * Snapshot of the "≈" comparison line for an income row at save time
 * (entry currency → user's comparison currency).
 */
export async function computeIncomeApproxSnapshot(args: {
  amountOriginal: number;
  entryCurrency: string;
  comparisonCurrency: string;
}): Promise<{ approx_amount: number; approx_currency: string } | null> {
  const primary = args.entryCurrency.trim().toUpperCase() || "EUR";
  const secondary = normalizeSecondary(args.comparisonCurrency, primary);
  if (secondary === primary) return null;
  const rate = await fetchFxRate(primary, secondary);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return {
    approx_amount: roundMoney(args.amountOriginal * rate),
    approx_currency: secondary,
  };
}
