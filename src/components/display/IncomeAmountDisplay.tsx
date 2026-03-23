import { formatCurrency } from "@/lib/finance/format";

type Row = {
  amount_original?: number | string | null;
  amount_converted?: number | string | null;
  currency?: string | null;
};

export function IncomeAmountDisplay({
  row,
  baseCurrency,
  showConvertedHint = true,
}: {
  row: Row;
  baseCurrency: string;
  showConvertedHint?: boolean;
}) {
  const orig = Number(row.amount_original ?? 0);
  const cur = String(row.currency ?? "EUR").trim().toUpperCase() || "EUR";
  const base = baseCurrency.trim().toUpperCase() || "EUR";
  const conv = Number(row.amount_converted ?? orig);

  const same = cur === base;

  return (
    <div className="text-right">
      <span className="text-emerald-300">
        {formatCurrency(orig, cur)}
      </span>
      {showConvertedHint && !same ? (
        <div className="text-xs text-zinc-500">
          ≈ {formatCurrency(conv, base)}
        </div>
      ) : null}
    </div>
  );
}
