/**
 * Lock affordance for hourly-rate insights gated on Basic+ (see permissions.rateInsights).
 */

export const RATE_INSIGHT_UPGRADE_HINT =
  "Upgrade to Basic or Pro to see hourly rate insights.";

export function RateInsightLockIcon({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`${dim} shrink-0 ${className}`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3A5.25 5.25 0 0 0 12 1.5Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Dashboard insight cards when plan has no rateInsights. */
export function InsightLockedState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
      <RateInsightLockIcon size="lg" className="text-zinc-600" />
      <p className="max-w-[14rem] text-xs leading-relaxed text-zinc-500">
        {RATE_INSIGHT_UPGRADE_HINT}
      </p>
    </div>
  );
}

/** Compact lock for table cells / small stat slots (hover shows upgrade via `title`). */
export function RateInsightLockInline({
  title = RATE_INSIGHT_UPGRADE_HINT,
  size = "sm",
}: {
  title?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className="inline-flex cursor-help items-center justify-end gap-1 text-zinc-500"
      title={title}
    >
      <RateInsightLockIcon size={size} className="text-zinc-500" />
    </span>
  );
}
