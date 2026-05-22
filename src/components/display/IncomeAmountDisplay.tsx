import { formatCurrency } from "@/lib/finance/format";
import { FxSubline } from "@/components/display/FxSubline";

type Row = {
  amount_original?: number | string | null;
  amount_converted?: number | string | null;
  currency?: string | null;
  approx_amount?: number | string | null;
  approx_currency?: string | null;
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
  const approxRaw = row.approx_amount;
  const approxAmt =
    approxRaw != null && String(approxRaw).trim() !== ""
      ? Number(approxRaw)
      : null;
  const approxCur = String(row.approx_currency ?? "").trim().toUpperCase() || "";
  const hasFrozenApprox =
    approxAmt != null &&
    Number.isFinite(approxAmt) &&
    approxCur.length >= 3 &&
    approxCur !== cur;

  return (
    <div className="text-right">
      <span className={accentClassName}>{formatCurrency(orig, cur)}</span>
      {showConvertedHint ? (
        hasFrozenApprox ? (
          <div className="text-xs tabular-nums text-zinc-500 inline-flex max-w-full min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
            <span>≈ {formatCurrency(approxAmt!, approxCur)}</span>
          </div>
        ) : (
          <FxSubline amount={orig} currency={cur} className="text-xs text-zinc-500" />
        )
      ) : null}
    </div>
  );
}
