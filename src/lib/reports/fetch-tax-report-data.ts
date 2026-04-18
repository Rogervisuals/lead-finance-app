import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardRangeMeta } from "@/lib/dashboard-date-range";
import { toISODateOnly } from "@/lib/dashboard-date-range";

export type TaxReportIncomeRow = {
  date: string;
  clientName: string;
  company: string;
  projectName: string;
  amount: number;
  currency: string;
};

export type TaxReportExpenseRow = {
  date: string;
  clientName: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
};

export type TaxReportGeneralExpenseRow = {
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
};

export type TaxReportHourRow = {
  date: string;
  clientName: string;
  projectName: string;
  hours: number;
};

export type TaxReportMileageRow = {
  date: string;
  projectName: string;
  route: string;
  tripTypeLabel: string;
  distanceKm: number;
  notes: string;
};

export type TaxReportCompanyRow = {
  companyName: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  clientCount: number;
  projectCount: number;
};

export type TaxReportClientRow = {
  clientName: string;
  totalIncome: number;
  totalHours: number;
  projectCount: number;
};

export type TaxReportPayload = {
  businessName: string;
  reportingPeriodLabel: string;
  exportDateLabel: string;
  baseCurrency: string;
  totalIncome: number;
  /** Sum of `mileage.distance_km` in the reporting period (final stored distance). */
  totalMileageKm: number;
  totalWorkedHours: number;
  /** Project-linked expenses from `expenses` (base currency, converted). */
  totalProjectExpenses: number;
  /** General business expenses from `business_expenses` (base currency, converted). */
  totalGeneralExpenses: number;
  /** Total expenses (project + general) in base currency (converted). */
  totalExpenses: number;
  netProfit: number;
  income: TaxReportIncomeRow[];
  expenses: TaxReportExpenseRow[];
  hours: TaxReportHourRow[];
  companies: TaxReportCompanyRow[];
  clients: TaxReportClientRow[];
  generalExpenses: TaxReportGeneralExpenseRow[];
  mileage: TaxReportMileageRow[];
};

function num(v: unknown) {
  return Number(v ?? 0);
}

function sortByDateAsc<T extends { date: string }>(rows: T[]) {
  return [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function sortByDateAscHours<T extends { date: string }>(rows: T[]) {
  return [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function mileageLocationLabel(key: string | null | undefined): string {
  const k = String(key ?? "").trim().toLowerCase();
  if (!k) return "";
  if (k === "home" || k === "huis") return "Huis";
  return k
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Uses ASCII `>` so the route reads clearly in PDF (Helvetica often omits Unicode arrows like →). */
function mileageRoute(start: string | null | undefined, end: string | null | undefined): string {
  const a = mileageLocationLabel(start ?? "home");
  const b = mileageLocationLabel(end ?? "");
  if (a && b) return `${a} > ${b}`;
  if (a) return a;
  if (b) return b;
  return "—";
}

export async function fetchTaxReportData(
  supabase: SupabaseClient,
  userId: string,
  range: DashboardRangeMeta,
  opts: {
    businessName: string;
    baseCurrency: string;
    reportingPeriodLabel: string;
    exportDate: Date;
  }
): Promise<TaxReportPayload> {
  const exportDateLabel = opts.exportDate.toISOString().slice(0, 19).replace("T", " ") + " UTC";

  const isoStart =
    range.monthStart && range.kind !== "all" ? toISODateOnly(range.monthStart) : null;
  const isoEndExclusive =
    range.monthEndExclusive && range.kind !== "all"
      ? toISODateOnly(range.monthEndExclusive)
      : null;

  const monthStartMs = range.monthStart?.getTime() ?? null;
  const monthEndExclusiveMs = range.monthEndExclusive?.getTime() ?? null;

  let clientsQuery = supabase
    .from("clients")
    .select("id,name,company,company_id")
    .eq("user_id", userId);

  const clientsFirst = await clientsQuery;
  let clientsRaw = clientsFirst.data;
  if (clientsFirst.error) {
    const legacy = await supabase
      .from("clients")
      .select("id,name,company")
      .eq("user_id", userId);
    if (legacy.error) throw new Error(legacy.error.message);
    clientsRaw = legacy.data as typeof clientsRaw;
  }

  const clients = (clientsRaw ?? []) as Array<{
    id: string;
    name: string;
    company: string | null;
    company_id?: string | null;
  }>;

  const { data: companiesRaw, error: companiesErr } = await supabase
    .from("companies")
    .select("id,name")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (companiesErr) throw new Error(companiesErr.message);
  const companiesList = (companiesRaw ?? []) as Array<{ id: string; name: string }>;
  const companyNameById = new Map(companiesList.map((c) => [c.id, c.name]));

  const { data: projectsRaw, error: projectsErr } = await supabase
    .from("projects")
    .select("id,name,client_id,start_date")
    .eq("user_id", userId);

  if (projectsErr) throw new Error(projectsErr.message);
  const allProjects = (projectsRaw ?? []) as Array<{
    id: string;
    name: string;
    client_id: string;
    start_date?: string | null;
  }>;

  const projectById = new Map(allProjects.map((p) => [p.id, p]));

  const projectsForCounts =
    range.kind !== "all" && isoStart && isoEndExclusive
      ? allProjects.filter((p) => {
          const s = String(p.start_date ?? "").slice(0, 10);
          if (!s || s.length !== 10) return false;
          return s >= isoStart && s < isoEndExclusive;
        })
      : allProjects;

  const projectsByClientId = new Map<string, typeof projectsForCounts>();
  for (const p of projectsForCounts) {
    const list = projectsByClientId.get(p.client_id) ?? [];
    list.push(p);
    projectsByClientId.set(p.client_id, list);
  }

  const clientById = new Map(clients.map((c) => [c.id, c]));

  function companyDisplayForClient(c: (typeof clients)[0]): string {
    if (c.company_id && companyNameById.has(c.company_id)) {
      return companyNameById.get(c.company_id)!;
    }
    return (c.company ?? "").trim() || "—";
  }

  let incomeQuery = supabase
    .from("income")
    .select(
      "id,date,amount_original,amount_converted,currency,description,client_id,project_id"
    )
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (range.kind !== "all" && isoStart && isoEndExclusive) {
    incomeQuery = incomeQuery.gte("date", isoStart).lt("date", isoEndExclusive);
  }

  let expenseQuery = supabase
    .from("expenses")
    .select(
      "id,date,amount_original,amount_converted,currency,category,description,client_id,project_id"
    )
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (range.kind !== "all" && isoStart && isoEndExclusive) {
    expenseQuery = expenseQuery.gte("date", isoStart).lt("date", isoEndExclusive);
  }

  let generalExpensesQuery = supabase
    .from("business_expenses")
    .select("id,date,notes,amount,amount_original,currency,category")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (range.kind !== "all" && isoStart && isoEndExclusive) {
    generalExpensesQuery = generalExpensesQuery.gte("date", isoStart).lt("date", isoEndExclusive);
  }

  let hoursQuery = supabase
    .from("hours")
    .select("id,start_time,hours,client_id,project_id")
    .eq("user_id", userId)
    .order("start_time", { ascending: true });

  if (range.kind !== "all" && monthStartMs != null && monthEndExclusiveMs != null) {
    hoursQuery = hoursQuery
      .gte("start_time", new Date(monthStartMs).toISOString())
      .lt("start_time", new Date(monthEndExclusiveMs).toISOString());
  }

  let mileageQuery = supabase
    .from("mileage")
    .select(
      "id,date,distance_km,trip_type,start_location,end_location,notes,project_id,project:projects(name)"
    )
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (range.kind !== "all" && isoStart && isoEndExclusive) {
    mileageQuery = mileageQuery.gte("date", isoStart).lt("date", isoEndExclusive);
  }

  const [
    { data: incomeRows, error: incomeErr },
    { data: expenseRows, error: expErr },
    { data: hourRows, error: hErr },
    { data: generalExpensesRows, error: geErr },
    { data: mileageRows, error: mileageErr },
  ] = await Promise.all([
    incomeQuery,
    expenseQuery,
    hoursQuery,
    generalExpensesQuery,
    mileageQuery,
  ]);

  if (geErr) throw new Error(geErr.message);
  if (incomeErr) throw new Error(incomeErr.message);
  if (expErr) throw new Error(expErr.message);
  if (hErr) throw new Error(hErr.message);
  if (mileageErr) throw new Error(mileageErr.message);

  const incomeLines: TaxReportIncomeRow[] = (incomeRows ?? []).map((r: any) => {
    const client = r.client_id ? clientById.get(r.client_id) : undefined;
    const clientName = client?.name ?? "—";
    const company = client ? companyDisplayForClient(client) : "—";
    const proj = r.project_id ? projectById.get(r.project_id) : undefined;
    const projectName = proj?.name ?? "—";
    return {
      date: String(r.date ?? "").slice(0, 10),
      clientName,
      company,
      projectName,
      amount: num(r.amount_original),
      currency: String(r.currency ?? opts.baseCurrency).toUpperCase(),
    };
  });

  const expenseLines: TaxReportExpenseRow[] = (expenseRows ?? []).map((r: any) => ({
    date: String(r.date ?? "").slice(0, 10),
    clientName: r.client_id ? clientById.get(r.client_id)?.name ?? "—" : "—",
    description: String(r.description ?? "").trim() || "—",
    amount: num(r.amount_original),
    currency: String(r.currency ?? opts.baseCurrency).toUpperCase(),
    category: String(r.category ?? "").trim() || "—",
  }));

  const generalExpensesLines: TaxReportGeneralExpenseRow[] = (generalExpensesRows ?? []).map((r: any) => ({
    date: String(r.date ?? "").slice(0, 10),
    description: String(r.notes ?? "").trim() || "—",
    amount: num(r.amount_original),
    category: String(r.category ?? "").trim() || "—",
    currency: String(r.currency ?? opts.baseCurrency).toUpperCase(),
  }));

  const projectToClient = new Map(allProjects.map((p) => [p.id, p.client_id]));

  const hourLines: TaxReportHourRow[] = (hourRows ?? []).map((r: any) => {
    const st = r.start_time ? new Date(r.start_time) : null;
    const dateStr = st && !Number.isNaN(st.getTime()) ? toISODateOnly(st) : "—";
    let cid = r.client_id as string | null | undefined;
    if (!cid && r.project_id) {
      cid = projectToClient.get(r.project_id) ?? null;
    }
    const client = cid ? clientById.get(cid) : undefined;
    const clientName = client?.name ?? "—";
    const proj = r.project_id ? projectById.get(r.project_id) : undefined;
    const projectName = proj?.name ?? "—";
    return {
      date: dateStr,
      clientName,
      projectName,
      hours: num(r.hours),
    };
  });

  const mileageLines: TaxReportMileageRow[] = (mileageRows ?? []).map((r: any) => {
    const embedded = r.project;
    const embeddedName = Array.isArray(embedded)
      ? embedded[0]?.name
      : embedded?.name;
    const fromMap = r.project_id ? projectById.get(r.project_id) : undefined;
    const projectName =
      embeddedName != null && String(embeddedName).trim()
        ? String(embeddedName).trim()
        : fromMap?.name
          ? String(fromMap.name)
          : "—";
    const trip = String(r.trip_type ?? "one_way").toLowerCase();
    const tripTypeLabel = trip === "round_trip" ? "Round trip" : "One way";
    return {
      date: String(r.date ?? "").slice(0, 10),
      projectName,
      route: mileageRoute(r.start_location, r.end_location),
      tripTypeLabel,
      distanceKm: num(r.distance_km),
      notes: String(r.notes ?? "").trim() || "—",
    };
  });

  const totalIncomeConverted = (incomeRows ?? []).reduce(
    (acc, r: any) => acc + num(r.amount_converted),
    0
  );
  const totalExpensesConverted = (expenseRows ?? []).reduce(
    (acc, r: any) => acc + num(r.amount_converted),
    0
  );

  const totalGeneralExpensesConverted = (generalExpensesRows ?? []).reduce(
    (acc, r: any) => acc + num(r.amount),
    0
  );

  const totalExpensesAllConverted = totalExpensesConverted + totalGeneralExpensesConverted;
  const totalWorkedHours = (hourRows ?? []).reduce((acc, r: any) => acc + num(r.hours), 0);
  const totalMileageKm = (mileageRows ?? []).reduce((acc, r: any) => acc + num(r.distance_km), 0);

  const companyRows: TaxReportCompanyRow[] = companiesList.map((co) => {
    const clientIds = clients.filter((c) => c.company_id === co.id).map((c) => c.id);
    const clientSet = new Set(clientIds);
    let inc = 0;
    for (const r of incomeRows ?? []) {
      const row = r as { client_id?: string | null; amount_converted?: unknown };
      if (row.client_id && clientSet.has(row.client_id)) {
        inc += num(row.amount_converted);
      }
    }
    let exp = 0;
    for (const r of expenseRows ?? []) {
      const row = r as { client_id?: string | null; amount_converted?: unknown };
      if (row.client_id && clientSet.has(row.client_id)) {
        exp += num(row.amount_converted);
      }
    }

    let ge = 0;
    for (const r of generalExpensesRows ?? []) {
      const row = r as { client_id?: string | null; amount_converted?: unknown };
      if (row.client_id && clientSet.has(row.client_id)) {
        ge += num(row.amount_converted);
      }
    }

    const projectCount = projectsForCounts.filter((p) => clientSet.has(p.client_id)).length;
    return {
      companyName: co.name,
      totalIncome: Math.round(inc * 100) / 100,
      totalExpenses: Math.round(exp * 100) / 100,
      netProfit: Math.round((inc - exp) * 100) / 100,
      clientCount: clientIds.length,
      projectCount,
    };
  });

  const incomeByClient = new Map<string, number>();
  for (const r of incomeRows ?? []) {
    const row = r as { client_id?: string | null; amount_converted?: unknown };
    if (!row.client_id) continue;
    incomeByClient.set(
      row.client_id,
      (incomeByClient.get(row.client_id) ?? 0) + num(row.amount_converted)
    );
  }

  const hoursByClient = new Map<string, number>();
  for (const r of hourRows ?? []) {
    const row = r as { client_id?: string | null; project_id?: string | null; hours?: unknown };
    let cid = row.client_id ?? null;
    if (!cid && row.project_id) {
      cid = projectToClient.get(row.project_id) ?? null;
    }
    if (!cid) continue;
    hoursByClient.set(cid, (hoursByClient.get(cid) ?? 0) + num(row.hours));
  }

  const clientOverview: TaxReportClientRow[] = clients
    .map((c) => ({
      clientName: c.name,
      totalIncome: Math.round((incomeByClient.get(c.id) ?? 0) * 100) / 100,
      totalHours: Math.round((hoursByClient.get(c.id) ?? 0) * 100) / 100,
      projectCount: (projectsByClientId.get(c.id) ?? []).length,
    }))
    .filter((c) => c.projectCount > 0)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  return {
    businessName: opts.businessName,
    reportingPeriodLabel: opts.reportingPeriodLabel,
    exportDateLabel,
    baseCurrency: opts.baseCurrency,
    totalIncome: Math.round(totalIncomeConverted * 100) / 100,
    totalMileageKm: Math.round(totalMileageKm * 100) / 100,
    totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
    totalProjectExpenses: Math.round(totalExpensesConverted * 100) / 100,
    totalGeneralExpenses: Math.round(totalGeneralExpensesConverted * 100) / 100,
    totalExpenses: Math.round(totalExpensesAllConverted * 100) / 100,
    netProfit: Math.round((totalIncomeConverted - totalExpensesAllConverted) * 100) / 100,
    income: sortByDateAsc(incomeLines),
    expenses: sortByDateAsc(expenseLines),
    generalExpenses: sortByDateAsc(generalExpensesLines),
    hours: sortByDateAscHours(hourLines),
    mileage: sortByDateAsc(mileageLines),
    companies: companyRows.sort((a, b) => a.companyName.localeCompare(b.companyName)),
    clients: clientOverview,
  };
}
