import { formatCurrency, formatHourlyRate } from "@/lib/finance/format";
import { roundMoney } from "@/lib/finance/income-currency";
import { getFxRateToUsd } from "@/lib/finance/usd-equivalent";

const defaultUsdLine =
  "text-xs tabular-nums text-zinc-500";

export async function UsdSubline({
  amount,
  currency,
  className = defaultUsdLine,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const c = currency.trim().toUpperCase() || "EUR";
  if (c === "USD") return null;
  const rate = await getFxRateToUsd(c);
  if (rate == null) return null;
  const usd = roundMoney(amount * rate);
  return (
    <div className={className} data-usd-subline>
      ≈ {formatCurrency(usd, "USD")}
    </div>
  );
}

export async function CurrencyWithUsd({
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
      <UsdSubline amount={amount} currency={currency} className={usdClassName} />
    </div>
  );
}

export async function HourlyRateWithUsd({
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
      <UsdSubline amount={rate} currency={currency} className={usdClassName} />
    </div>
  );
}
