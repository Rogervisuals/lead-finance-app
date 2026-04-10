import { formatCurrency } from "@/lib/finance/format";
import { FxSubline } from "@/components/display/FxSubline";

type Row = {
  amount_original?: number | string | null;
  amount_converted?: number | string | null;
  currency?: string | null;
};

export function IncomeAmountDisplay({
  row,
  baseCurrency: _baseCurrency,
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
  return (
    <div className="text-right">
      <span className={accentClassName}>{formatCurrency(orig, cur)}</span>
      {showConvertedHint ? (
        <FxSubline amount={orig} currency={cur} className="text-xs text-zinc-500" />
      ) : null}
    </div>
  );
}
