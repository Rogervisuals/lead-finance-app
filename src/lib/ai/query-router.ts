import type { SupabaseClient } from "@supabase/supabase-js";

type Period = "this_month" | "last_month" | "this_year" | "last_year";

export type DbOnlyAnswer =
  | { ok: true; answer: string }
  | { ok: false; reason: "not_db_only" };

function toIsoDateOnlyUTC(d: Date) {
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function currencySymbol(code: string) {
  const c = String(code ?? "").trim().toUpperCase();
  if (c === "USD") return "$";
  if (c === "GBP") return "£";
  return "€";
}

function fmtMoney(amount: number, currency: string) {
  const sym = currencySymbol(currency);
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return `${sym}—`;
  try {
    return `${sym}${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(n)}`;
  } catch {
    return `${sym}${n.toFixed(2)}`;
  }
}

function resolveRange(period: Period) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m0 = now.getUTCMonth();
  const mk = (yy: number, mm0: number) => ({
    start: new Date(Date.UTC(yy, mm0, 1)),
    endExclusive: new Date(Date.UTC(yy, mm0 + 1, 1)),
  });
  if (period === "this_month") return mk(y, m0);
  if (period === "last_month") return mk(y, m0 - 1);
  if (period === "this_year") return { start: new Date(Date.UTC(y, 0, 1)), endExclusive: new Date(Date.UTC(y + 1, 0, 1)) };
  return { start: new Date(Date.UTC(y - 1, 0, 1)), endExclusive: new Date(Date.UTC(y, 0, 1)) };
}

function looksLikeDbOnlyQuery(message: string) {
  const m = message.trim().toLowerCase();
  if (!m) return null;

  // Core intents
  const isBestMonth = /\b(best|highest|most)\b.*\bmonth\b|\bbest\s+month\b/.test(m) || /\bwhen did i make the most\b/.test(m);
  const isTotalRevenue = /\b(total|sum)\b.*\b(revenue|income|earnings)\b|\btotal\s+(revenue|income|earnings)\b/.test(m);
  const isProjectRevenue = /\b(project)\b.*\b(revenue|income|earnings)\b|\brevenue\s+from\b/.test(m);
  const isTotalHours = /\btotal\b.*\bhours\b|\bhow many hours\b|\bhours worked\b/.test(m);

  const period: Period =
    /\blast\s+month\b/.test(m) ? "last_month" :
    /\bthis\s+year\b/.test(m) ? "this_year" :
    /\blast\s+year\b/.test(m) ? "last_year" :
    "this_month";

  const projectMatch =
    m.match(/\bproject\s+([a-z0-9][a-z0-9\s\-_]{1,40})\b/i) ??
    m.match(/\brevenue\s+from\s+([a-z0-9][a-z0-9\s\-_]{1,40})\b/i);
  const project_name = projectMatch ? projectMatch[1].trim() : null;

  if (isBestMonth) return { kind: "best_month" as const, period };
  if (isTotalRevenue) return { kind: "total_income" as const, period };
  if (isProjectRevenue && project_name) return { kind: "project_revenue" as const, period, project_name };
  if (isTotalHours) return { kind: "total_hours" as const, period };
  return null;
}

async function getBaseCurrency(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_settings")
    .select("base_currency")
    .eq("user_id", userId)
    .maybeSingle();
  const base = String((data as any)?.base_currency ?? "EUR").trim().toUpperCase();
  return base || "EUR";
}

export async function tryDbOnlyAnswer(
  supabase: SupabaseClient,
  userId: string,
  message: string
): Promise<DbOnlyAnswer> {
  const intent = looksLikeDbOnlyQuery(message);
  if (!intent) return { ok: false, reason: "not_db_only" };

  const baseCurrency = await getBaseCurrency(supabase, userId);
  const { start, endExclusive } = resolveRange(intent.period);
  const startIso = toIsoDateOnlyUTC(start);
  const endIso = toIsoDateOnlyUTC(new Date(endExclusive.getTime() - 24 * 3600 * 1000));

  if (intent.kind === "total_income") {
    const { data, error } = await supabase
      .from("income")
      .select("amount_converted,date")
      .eq("user_id", userId)
      .gte("date", startIso)
      .lte("date", endIso);
    if (error) throw new Error(error.message || "Income lookup failed.");
    const total = (data ?? []).reduce((acc: number, r: any) => acc + Number(r.amount_converted ?? 0), 0);
    return { ok: true, answer: `Total revenue (${startIso} – ${endIso}): ${fmtMoney(total, baseCurrency)}` };
  }

  if (intent.kind === "total_hours") {
    const { data, error } = await supabase
      .from("hours")
      .select("hours,start_time")
      .eq("user_id", userId)
      .gte("start_time", start.toISOString())
      .lt("start_time", endExclusive.toISOString());
    if (error) throw new Error(error.message || "Hours lookup failed.");
    const total = (data ?? []).reduce((acc: number, r: any) => acc + Number(r.hours ?? 0), 0);
    return { ok: true, answer: `Total hours (${startIso} – ${endIso}): ${total.toFixed(2)}h` };
  }

  if (intent.kind === "best_month") {
    const { data, error } = await supabase
      .from("income")
      .select("amount_converted,date")
      .eq("user_id", userId)
      .gte("date", startIso)
      .lte("date", endIso);
    if (error) throw new Error(error.message || "Income lookup failed.");
    const totals = new Map<string, number>();
    for (const r of data ?? []) {
      const k = String((r as any).date ?? "").slice(0, 7);
      if (!k) continue;
      totals.set(k, (totals.get(k) ?? 0) + Number((r as any).amount_converted ?? 0));
    }
    const entries = Array.from(totals.entries()).sort((a, b) => a[1] - b[1]);
    if (!entries.length) return { ok: true, answer: "No income found for that period." };
    const pick = entries[entries.length - 1];
    return { ok: true, answer: `Best month: ${pick[0]} (${fmtMoney(pick[1], baseCurrency)})` };
  }

  if (intent.kind === "project_revenue") {
    const search = intent.project_name.trim();
    const { data: projects, error: projErr } = await supabase
      .from("projects")
      .select("id,name")
      .eq("user_id", userId)
      .ilike("name", `%${search}%`)
      .limit(10);
    if (projErr) throw new Error(projErr.message || "Projects lookup failed.");
    if (!projects?.length) return { ok: true, answer: "Project not found." };
    const pid = String((projects[0] as any).id);
    const { data: incomeRows, error: incErr } = await supabase
      .from("income")
      .select("amount_converted,date,project_id")
      .eq("user_id", userId)
      .eq("project_id", pid)
      .gte("date", startIso)
      .lte("date", endIso);
    if (incErr) throw new Error(incErr.message || "Income lookup failed.");
    const total = (incomeRows ?? []).reduce((acc: number, r: any) => acc + Number(r.amount_converted ?? 0), 0);
    return { ok: true, answer: `Project revenue (${projects[0].name}): ${fmtMoney(total, baseCurrency)}` };
  }

  return { ok: false, reason: "not_db_only" };
}

