import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatISODateTime } from "@/lib/finance/format";
import { CurrencyWithUsd } from "@/components/display/CurrencyWithUsd";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function sumIncomeConverted(
  rows: Array<{ amount_converted?: string | number | null | undefined }>
) {
  return rows.reduce((acc, r) => acc + Number(r.amount_converted ?? 0), 0);
}

function sumHours(rows: Array<{ hours?: string | number | null | undefined }>) {
  return rows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { page?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projectId = params.id;
  const pageRaw = Math.max(1, parseInt(String(searchParams?.page ?? "1"), 10) || 1);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,status,client_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    redirect("/projects");
  }

  const settings = await getOrCreateUserFinancialSettings(user.id);
  const baseCurrency = settings.base_currency;

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id,name")
    .eq("id", project.client_id)
    .eq("user_id", user.id)
    .single();

  const [{ data: incomeRows }, { data: allHoursForTotals }, { count: hourCount }] =
    await Promise.all([
      supabase
        .from("income")
        .select("amount_converted")
        .eq("user_id", user.id)
        .eq("project_id", projectId),
      supabase
        .from("hours")
        .select("hours")
        .eq("user_id", user.id)
        .eq("project_id", projectId),
      supabase
        .from("hours")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("project_id", projectId),
    ]);

  const totalIncome = sumIncomeConverted(incomeRows ?? []);
  const totalHours = sumHours(allHoursForTotals ?? []);
  const totalHourEntries = hourCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalHourEntries / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageRaw), totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: hourPageRows } = await supabase
    .from("hours")
    .select("id,start_time,end_time,hours,notes")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .order("start_time", { ascending: false })
    .range(from, to);

  const baseUrl = `/projects/${projectId}`;
  const queryFor = (p: number) =>
    p <= 1 ? baseUrl : `${baseUrl}?page=${p}`;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          <Link href="/projects" className="text-sky-400 hover:underline">
            Projects
          </Link>
          <span className="mx-1 text-zinc-600">/</span>
          <span className="text-zinc-400">{project.name}</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {clientRow ? (
            <>
              Client:{" "}
              <Link
                href={`/clients/${clientRow.id}`}
                className="text-sky-400 hover:underline"
              >
                {clientRow.name}
              </Link>
            </>
          ) : (
            "—"
          )}
          {project.status ? (
            <span className="ml-2 text-zinc-500">· {project.status}</span>
          ) : null}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Income (total, {baseCurrency})</div>
          <div className="mt-2">
            <CurrencyWithUsd
              amount={totalIncome}
              currency={baseCurrency}
              primaryClassName="text-2xl font-semibold text-emerald-300"
              usdClassName="mt-1 text-xs tabular-nums text-emerald-200/70"
            />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm text-zinc-400">Total hours</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-sky-300">
            {totalHours.toFixed(2)}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Logged hours</h2>
          {totalHourEntries > 0 ? (
            <p className="text-xs text-zinc-500">
              Showing {currentPage * PAGE_SIZE - PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, totalHourEntries)} of {totalHourEntries}
            </p>
          ) : null}
        </div>

        {hourPageRows?.length ? (
          <>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-[min(100%,640px)] text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-2">Start</th>
                    <th className="py-2 pr-2">End</th>
                    <th className="w-24 py-2 text-right">Hours</th>
                    <th className="min-w-0 py-2 pl-4 sm:min-w-[8rem]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {hourPageRows.map((row: any) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-2 text-zinc-300">
                        {formatISODateTime(row.start_time)}
                      </td>
                      <td className="py-2 pr-2 text-zinc-300">
                        {formatISODateTime(row.end_time)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-zinc-200">
                        {Number(row.hours ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2 pl-4 text-zinc-500">
                        {row.notes?.trim() ? row.notes : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <div className="text-xs text-zinc-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={queryFor(currentPage - 1)}
                      className="rounded-md border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600">
                      Previous
                    </span>
                  )}
                  {currentPage < totalPages ? (
                    <Link
                      href={queryFor(currentPage + 1)}
                      className="rounded-md border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600">
                      Next
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No hours logged for this project yet.
          </div>
        )}
      </section>

      <div>
        <Link
          href={`/projects/${projectId}/edit`}
          className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
        >
          Edit project
        </Link>
      </div>
    </div>
  );
}
