"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

type Option = { value: string; label: string };

/**
 * Range / project filters for the client summary page. Navigates with `router.replace`
 * when either select changes so the server can re-render project options for the chosen range.
 */
export function ClientSummaryFiltersForm({
  clientId,
  defaultRange,
  defaultProject,
  saved,
  rangeOptions,
  projectOptions,
}: {
  clientId: string;
  defaultRange: string;
  defaultProject: string;
  saved: boolean;
  rangeOptions: Option[];
  projectOptions: Option[];
}) {
  const router = useRouter();

  const navigate = useCallback(
    (range: string, project: string) => {
      const params = new URLSearchParams();
      if (range) params.set("range", range);
      const p = project.trim();
      if (p) params.set("project", p);
      if (saved) params.set("saved", "1");
      const q = params.toString();
      router.replace(q ? `/clients/${clientId}?${q}` : `/clients/${clientId}`);
    },
    [clientId, saved, router],
  );

  return (
    <div
      role="group"
      aria-label="Filter by period and project"
      className="flex w-full min-w-0 flex-nowrap items-center gap-2 md:max-w-md lg:max-w-lg"
    >
      <label className="sr-only" htmlFor="client-range-filter">
        Filter by month / year
      </label>
      <select
        id="client-range-filter"
        defaultValue={defaultRange}
        onChange={(e) => {
          navigate(e.target.value, "");
        }}
        className="h-9 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900/20 px-2 text-sm text-zinc-100 outline-none hover:bg-zinc-900/40 focus:border-sky-500 sm:px-3"
      >
        {rangeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="client-project-filter">
        Filter by project
      </label>
      <select
        id="client-project-filter"
        defaultValue={defaultProject}
        onChange={(e) => {
          const root = e.target.closest('[role="group"]');
          const rangeEl =
            root?.querySelector<HTMLSelectElement>("#client-range-filter");
          navigate(rangeEl?.value ?? defaultRange, e.target.value);
        }}
        className="h-9 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900/20 px-2 text-sm text-zinc-100 outline-none hover:bg-zinc-900/40 focus:border-sky-500 sm:px-3"
      >
        {projectOptions.map((o) => (
          <option key={o.value || "__all__"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

    </div>
  );
}
