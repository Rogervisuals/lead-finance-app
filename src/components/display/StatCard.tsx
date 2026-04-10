import type { ReactNode } from "react";

export function StatCard({
  title,
  value,
  accent,
  border,
  valueClassName,
  hint,
}: {
  title: string;
  value: ReactNode;
  accent: string;
  border: string;
  valueClassName?: string;
  hint?: ReactNode;
}) {
  return (
    <div className={`rounded-xl border ${border} bg-zinc-900/20 p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-sm text-zinc-400">{title}</div>
        {hint ? <div className="shrink-0">{hint}</div> : null}
      </div>
      <div
        className={
          valueClassName ?? `mt-2 text-xl font-semibold ${accent}`
        }
      >
        {value}
      </div>
    </div>
  );
}
