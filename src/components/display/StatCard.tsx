import type { ReactNode } from "react";

export function StatCard({
  title,
  value,
  accent,
  border,
  valueClassName,
}: {
  title: string;
  value: ReactNode;
  accent: string;
  border: string;
  valueClassName?: string;
}) {
  return (
    <div className={`rounded-xl border ${border} bg-zinc-900/20 p-4`}>
      <div className="text-sm text-zinc-400">{title}</div>
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
