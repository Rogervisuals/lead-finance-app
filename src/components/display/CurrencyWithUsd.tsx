import { formatCurrency, formatHourlyRate } from "@/lib/finance/format";
import { FxSubline } from "@/components/display/FxSubline";

const defaultUsdLine =
  "text-xs tabular-nums text-zinc-500";

export function CurrencyWithUsd({
  amount,
  currency,
  className,
  primaryClassName,
  usdClassName,
}: {
  amount: number;
  currency: string;
  className?: string;
  primaryClassName?: string;
  usdClassName?: string;
}) {
  return (
    <div className={className}>
      <span className={primaryClassName}>{formatCurrency(amount, currency)}</span>
      <FxSubline amount={amount} currency={currency} className={usdClassName ?? defaultUsdLine} />
    </div>
  );
}

export function HourlyRateWithUsd({
  rate,
  currency,
  className,
  primaryClassName,
  usdClassName,
  align = "left",
}: {
  rate: number | null;
  currency: string;
  className?: string;
  primaryClassName?: string;
  usdClassName?: string;
  align?: "left" | "right";
}) {
  if (rate == null) {
    return (
      <div className={`${align === "right" ? "text-right" : ""} ${className ?? ""}`}>
        <span className={primaryClassName}>—</span>
      </div>
    );
  }
  return (
    <div
      className={`${align === "right" ? "text-right" : ""} ${className ?? ""}`}
    >
      <div className={primaryClassName}>{formatHourlyRate(rate, currency)}</div>
      <FxSubline amount={rate} currency={currency} className={usdClassName ?? defaultUsdLine} />
    </div>
  );
}
