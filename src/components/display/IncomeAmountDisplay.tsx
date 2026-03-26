import { formatCurrency } from "@/lib/finance/format";
import { UsdSubline } from "@/components/display/CurrencyWithUsd";

type Row = {
  amount_original?: number | string | null;
  amount_converted?: number | string | null;
  currency?: string | null;
};

export async function IncomeAmountDisplay({
  row,
  baseCurrency,
  showConvertedHint = true,
  accentClassName = "text-emerald-300",
}: {
  row: Row;
  baseCurrency: string;
  showConvertedHint?: boolean;
  accentClassName?: string;
}) {
  const orig = Number(row.amount_original ?? 0);
  const cur = String(row.currency ?? "EUR").trim().toUpperCase() || "EUR";
  const base = baseCurrency.trim().toUpperCase() || "EUR";
  const conv = Number(row.amount_converted ?? orig);

  const same = cur === base;

  return (
    <div className="text-right">
      <span className={accentClassName}>{formatCurrency(orig, cur)}</span>
      {cur !== "USD" ? (
        <UsdSubline amount={orig} currency={cur} className="text-xs text-zinc-500" />
      ) : null}
      {showConvertedHint && !same ? (
        <>
          <div className="text-xs text-zinc-500">
            ≈ {formatCurrency(conv, base)}
          </div>
          {base !== "USD" && cur !== "USD" ? (
            <UsdSubline
              amount={conv}
              currency={base}
              className="text-xs text-zinc-500"
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
