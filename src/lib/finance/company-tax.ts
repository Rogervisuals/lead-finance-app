import type { SupabaseClient } from "@supabase/supabase-js";

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Tax on a company's linked-client income, using the user's Settings tax %.
 * Matches the "Tax (estimate)" block on the company detail page.
 */
export function estimateTaxOnCompanyIncome(
  companyIncome: number,
  settingsTaxPercentage: number,
  taxEnabled: boolean
) {
  if (!taxEnabled) return 0;
  return roundMoney(Math.max(0, companyIncome) * (settingsTaxPercentage / 100));
}

export function incomeAfterCompanyTax(
  companyIncome: number,
  settingsTaxPercentage: number,
  taxEnabled: boolean
) {
  const tax = estimateTaxOnCompanyIncome(
    companyIncome,
    settingsTaxPercentage,
    taxEnabled
  );
  return taxEnabled
    ? roundMoney(companyIncome - tax)
    : roundMoney(companyIncome);
}

export type CompanyTaxIncomeRange =
  | { kind: "all" }
  | { kind: "month"; startIso: string; endExclusiveIso: string };

/**
 * Sums tax the same way as each company page: for every company with tax on,
 * (sum of income for that company's clients in the range) × (Settings tax %).
 */
export async function sumEstimatedTaxFromTaxEnabledCompanies(
  supabase: SupabaseClient,
  userId: string,
  settingsTaxPercentage: number,
  range: CompanyTaxIncomeRange
): Promise<number> {
  const { data: taxCompanies } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .eq("tax_enabled", true);

  const companyIds = (taxCompanies ?? []).map((c) => c.id as string);
  if (companyIds.length === 0) return 0;

  const { data: linkedClients } = await supabase
    .from("clients")
    .select("id,company_id")
    .eq("user_id", userId)
    .in("company_id", companyIds);

  const clientIds = (linkedClients ?? []).map((c) => (c as { id: string }).id);
  if (clientIds.length === 0) return 0;

  let incomeQuery = supabase
    .from("income")
    .select("client_id,amount_converted")
    .eq("user_id", userId)
    .in("client_id", clientIds);

  if (range.kind === "month") {
    incomeQuery = incomeQuery
      .gte("date", range.startIso)
      .lt("date", range.endExclusiveIso);
  }

  const { data: incomeRows } = await incomeQuery;

  const incomeByClient = new Map<string, number>();
  for (const r of incomeRows ?? []) {
    const cid = (r as { client_id: string | null }).client_id;
    if (!cid) continue;
    incomeByClient.set(
      cid,
      (incomeByClient.get(cid) ?? 0) +
        Number((r as { amount_converted: unknown }).amount_converted ?? 0)
    );
  }

  const clientsByCompany = new Map<string, string[]>();
  for (const row of linkedClients ?? []) {
    const cid = (row as { id: string; company_id: string | null }).company_id;
    if (!cid) continue;
    const list = clientsByCompany.get(cid) ?? [];
    list.push((row as { id: string }).id);
    clientsByCompany.set(cid, list);
  }

  const rate = settingsTaxPercentage / 100;
  let total = 0;
  for (const companyId of companyIds) {
    const cids = clientsByCompany.get(companyId) ?? [];
    if (cids.length === 0) continue;
    let companyIncome = 0;
    for (const clientId of cids) {
      companyIncome += incomeByClient.get(clientId) ?? 0;
    }
    total += roundMoney(Math.max(0, companyIncome) * rate);
  }

  return roundMoney(total);
}

/**
 * Per-client tax (same as client detail page): Settings % × max(0, net income)
 * where net = income (ex VAT) − expenses for that client in the range.
 * Clients linked to a company with tax on are skipped (company rollup covers them).
 */
export async function sumEstimatedTaxFromTaxEnabledClients(
  supabase: SupabaseClient,
  userId: string,
  settingsTaxPercentage: number,
  range: CompanyTaxIncomeRange
): Promise<number> {
  const { data: taxClients } = await supabase
    .from("clients")
    .select("id,company_id")
    .eq("user_id", userId)
    .eq("tax_enabled", true);

  const { data: companiesTaxOn } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .eq("tax_enabled", true);

  const companyTaxOn = new Set(
    (companiesTaxOn ?? []).map((c) => c.id as string)
  );

  const clientIds = (taxClients ?? [])
    .filter((row) => {
      const compId = (row as { company_id: string | null }).company_id;
      if (!compId) return true;
      return !companyTaxOn.has(compId);
    })
    .map((c) => (c as { id: string }).id);

  if (clientIds.length === 0) return 0;

  let incomeQuery = supabase
    .from("income")
    .select("client_id,amount_converted")
    .eq("user_id", userId)
    .in("client_id", clientIds);

  if (range.kind === "month") {
    incomeQuery = incomeQuery
      .gte("date", range.startIso)
      .lt("date", range.endExclusiveIso);
  }

  const { data: incomeRows } = await incomeQuery;

  let expenseQuery = supabase
    .from("expenses")
    .select("client_id,amount_converted")
    .eq("user_id", userId)
    .in("client_id", clientIds);

  if (range.kind === "month") {
    expenseQuery = expenseQuery
      .gte("date", range.startIso)
      .lt("date", range.endExclusiveIso);
  }

  const { data: expenseRows } = await expenseQuery;

  const incomeByClient = new Map<string, number>();
  for (const r of incomeRows ?? []) {
    const cid = (r as { client_id: string | null }).client_id;
    if (!cid) continue;
    incomeByClient.set(
      cid,
      (incomeByClient.get(cid) ?? 0) +
        Number((r as { amount_converted: unknown }).amount_converted ?? 0)
    );
  }

  const expenseByClient = new Map<string, number>();
  for (const r of expenseRows ?? []) {
    const cid = (r as { client_id: string | null }).client_id;
    if (!cid) continue;
    expenseByClient.set(
      cid,
      (expenseByClient.get(cid) ?? 0) +
        Number((r as { amount_converted: unknown }).amount_converted ?? 0)
    );
  }

  let total = 0;
  for (const clientId of clientIds) {
    const inc = incomeByClient.get(clientId) ?? 0;
    const exp = expenseByClient.get(clientId) ?? 0;
    const netIncome = roundMoney(inc - exp);
    total += estimateTaxOnCompanyIncome(
      netIncome,
      settingsTaxPercentage,
      true
    );
  }

  return roundMoney(total);
}

/**
 * Sum of (1) company-page tax on linked clients’ income and (2) client-page tax
 * on net income where the client is not under a tax-on company—same formulas as
 * those screens for the selected period.
 */
export async function sumDashboardEstimatedTax(
  supabase: SupabaseClient,
  userId: string,
  settingsTaxPercentage: number,
  range: CompanyTaxIncomeRange
): Promise<number> {
  const [fromCompanies, fromClients] = await Promise.all([
    sumEstimatedTaxFromTaxEnabledCompanies(
      supabase,
      userId,
      settingsTaxPercentage,
      range
    ),
    sumEstimatedTaxFromTaxEnabledClients(
      supabase,
      userId,
      settingsTaxPercentage,
      range
    ),
  ]);
  return roundMoney(fromCompanies + fromClients);
}
