import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiDailyCap, getAiMonthlyBudgetCap } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { handleAIRequest } from "@/lib/ai/handle-ai-request";
import {
  FLAGGED_REQUEST_DELAY_MAX_MS,
  FLAGGED_REQUEST_DELAY_MIN_MS,
  MIN_REQUEST_INTERVAL_MS,
} from "@/lib/ai/assistant-limits";
import { incrementAiAbuseStrike } from "@/lib/ai/abuse-strikes";
import { getClientIpFromRequest } from "@/lib/ai/get-client-ip";
import {
  checkRateLimits,
  getRequiresCaptchaAfterRequest,
  updateRateLimits,
} from "@/lib/ai/rate-limit-store";
import {
  applyResetsIfNeeded,
  getOrCreateUserAiUsageRow,
  tryFetchAbuseColumns,
  usageMetaFromRow,
  type UsageMeta,
} from "@/lib/ai/usage";
import { validateAiAssistantInput } from "@/lib/ai/validate-ai-input";

export const runtime = "nodejs";

type AiCreateClientResponse = {
  action: "create_client";
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
};

type AiUpdateClientResponse = {
  action: "update_client";
  search_name: string;
  new_name: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
};

type AiAddIncomeResponse = {
  action: "add_income";
  client_name: string;
  project_name: string | null;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
};

type AiDeleteIncomeResponse = {
  action: "delete_income";
  client_name: string;
  project_name: string | null;
  date: string;
  amount: number | null;
};

type AiDeleteClientResponse = {
  action: "delete_client";
  client_name: string;
  force: boolean;
};

type AiCreateCompanyResponse = {
  action: "create_company";
  company_name: string;
};

type AiCreateClientsResponse = {
  action: "create_clients";
  clients: Array<{
    name: string;
    email: string | null;
    notes: string | null;
  }>;
  company_name: string | null;
};

type AiCreateProjectResponse = {
  action: "create_project";
  client_name: string;
  project_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
};

type AiUpdateProjectStatusResponse = {
  action: "update_project_status";
  client_name: string;
  project_name: string;
  status: string;
  end_date: string;
};

type AiDeleteProjectResponse = {
  action: "delete_project";
  client_name: string;
  project_name: string;
};

type AiAddMileageResponse = {
  action: "add_mileage";
  date: string;
  /** When set, use this saved mileage template (id from the list in the system prompt). */
  template_id: string | null;
  trip_type: "one_way" | "round_trip" | null;
  start_location: string | null;
  end_location: string | null;
  /** One leg in km (same as the mileage form): round_trip = one-way distance; one_way = full trip. */
  leg_distance_km: number | null;
  notes: string | null;
};

type AiAddHoursResponse = {
  action: "add_hours";
  /** If set, log hours to this project (client inferred from the project). */
  project_name: string | null;
  /** If set (and project_name is null), log client-only hours. */
  client_name: string | null;
  /** "today" | "yesterday" | "tomorrow" | "YYYY-MM-DD" */
  date: string;
  /** Prefer "HH:MM" 24h. */
  start_time: string | null;
  /** Prefer "HH:MM" 24h. */
  end_time: string | null;
  /** Optional if start/end provided. */
  duration_hours: number | null;
  notes: string | null;
};

type AiAddBusinessExpenseResponse = {
  action: "add_business_expense";
  amount: number;
  currency: string | null;
  date: string;
  /** Optional: if missing, infer from text (parking => Transport, etc.). */
  category: string | null;
  notes: string | null;
};

type AiAddBusinessExpenseFromTemplateResponse = {
  action: "add_business_expense_from_template";
  /** Preferred when possible (UUID from templates list in system prompt). */
  template_id: string | null;
  /** Free-form name/keyword when template_id is unknown. */
  template_search: string | null;
  /** Optional disambiguator: if multiple templates match, pick one with this amount. */
  amount: number | null;
  date: string | null;
  notes: string | null;
};

type AiQueryPeriod = "this_month" | "last_month" | "this_year" | "last_year";

type AiQueryParameters = {
  year?: number;
  month?: number | "this_month" | "last_month";
  period?: AiQueryPeriod;
  project_name?: string;
  limit?: number;
};

type AiQueryResponse = {
  action:
    | "get_best_month"
    | "get_worst_month"
    | "get_total_income"
    | "get_total_expenses"
    | "get_profit"
    | "get_average_monthly_income"
    | "compare_periods"
    | "get_top_projects"
    | "get_project_revenue"
    | "get_best_project"
    | "get_total_hours"
    | "get_project_hours";
  parameters: AiQueryParameters;
};

type AiActionResponse =
  | AiCreateClientResponse
  | AiUpdateClientResponse
  | AiAddIncomeResponse
  | AiDeleteIncomeResponse
  | AiDeleteClientResponse
  | AiCreateCompanyResponse
  | AiCreateClientsResponse
  | AiCreateProjectResponse
  | AiUpdateProjectStatusResponse
  | AiDeleteProjectResponse
  | AiAddMileageResponse
  | AiAddHoursResponse
  | AiAddBusinessExpenseResponse
  | AiAddBusinessExpenseFromTemplateResponse
  | AiQueryResponse;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRelativeDate(input: string | null): string {
  const today = new Date();
  const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  if (!input) return toISO(today);
  const s = input.trim().toLowerCase();
  if (!s || s === "today") return toISO(today);
  if (s === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return toISO(y);
  }
  if (s === "tomorrow") {
    const y = new Date(today);
    y.setDate(y.getDate() + 1);
    return toISO(y);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return toISO(today);
}

function normalizeTimeOfDay(input: string | null): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  // 24h forms: 13:00, 13.00, 1300
  const m24 =
    raw.match(/^(\d{1,2})(?::|\.)(\d{2})$/) ?? raw.match(/^(\d{2})(\d{2})$/);
  if (m24) {
    const hh = Number(m24[1]);
    const mm = Number(m24[2]);
    if (
      Number.isFinite(hh) &&
      Number.isFinite(mm) &&
      hh >= 0 &&
      hh <= 23 &&
      mm >= 0 &&
      mm <= 59
    ) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  // 12h forms: 1pm, 1:30pm, 12am
  const m12 = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2] ?? "0");
    const ap = m12[3];
    if (
      !Number.isFinite(hh) ||
      !Number.isFinite(mm) ||
      hh < 1 ||
      hh > 12 ||
      mm < 0 ||
      mm > 59
    ) {
      return null;
    }
    if (ap === "am") hh = hh === 12 ? 0 : hh;
    if (ap === "pm") hh = hh === 12 ? 12 : hh + 12;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  return null;
}

function parseSingleAction(parsed: Record<string, unknown>): AiActionResponse | null {
  const queryActions = new Set([
    "get_best_month",
    "get_worst_month",
    "get_total_income",
    "get_total_expenses",
    "get_profit",
    "get_average_monthly_income",
    "compare_periods",
    "get_top_projects",
    "get_project_revenue",
    "get_best_project",
    "get_total_hours",
    "get_project_hours",
  ]);

  if (typeof parsed.action === "string" && queryActions.has(parsed.action)) {
    const p =
      parsed.parameters && typeof parsed.parameters === "object"
        ? (parsed.parameters as Record<string, unknown>)
        : {};

    const year =
      typeof p.year === "number" ? p.year : Number(p.year ?? NaN);

    const month =
      typeof p.month === "number"
        ? p.month
        : typeof p.month === "string"
          ? p.month
          : undefined;

    const period = typeof p.period === "string" ? p.period : undefined;

    const limit =
      typeof p.limit === "number" ? p.limit : Number(p.limit ?? NaN);

    const project_name = trimOrNull(p.project_name) ?? undefined;

    const monthOk =
      month == null ||
      (typeof month === "number" && month >= 1 && month <= 12) ||
      month === "this_month" ||
      month === "last_month";

    const periodOk =
      period == null ||
      period === "this_month" ||
      period === "last_month" ||
      period === "this_year" ||
      period === "last_year";

    const params: AiQueryParameters = {};
    if (Number.isFinite(year)) params.year = year;
    if (monthOk && month != null) params.month = month as any;
    if (periodOk && period != null) params.period = period as any;
    if (Number.isFinite(limit)) params.limit = Math.max(1, Math.floor(limit));
    if (project_name) params.project_name = project_name;

    return {
      action: parsed.action as AiQueryResponse["action"],
      parameters: params,
    };
  }

  if (parsed.action === "create_client") {
    const name = trimOrNull(parsed.name);
    if (!name) return null;
    return {
      action: "create_client",
      name,
      email: trimOrNull(parsed.email),
      company: trimOrNull(parsed.company),
      notes: trimOrNull(parsed.notes),
    };
  }
  if (parsed.action === "update_client") {
    const searchName = trimOrNull(parsed.search_name);
    if (!searchName) return null;
    return {
      action: "update_client",
      search_name: searchName,
      new_name: trimOrNull(parsed.new_name),
      email: trimOrNull(parsed.email),
      company: trimOrNull(parsed.company),
      notes: trimOrNull(parsed.notes),
    };
  }
  if (parsed.action === "add_income") {
    const clientName = trimOrNull(parsed.client_name);
    const amount =
      typeof parsed.amount === "number"
        ? parsed.amount
        : Number(parsed.amount ?? NaN);
    if (!clientName) return null;
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const currencyRaw = trimOrNull(parsed.currency);
    const currency = (currencyRaw ?? "EUR").toUpperCase();
    const projectName = trimOrNull(parsed.project_name);
    const description = trimOrNull(parsed.description);
    const date = normalizeRelativeDate(trimOrNull(parsed.date));
    return {
      action: "add_income",
      client_name: clientName,
      project_name: projectName,
      amount,
      currency,
      date,
      description,
    };
  }
  if (parsed.action === "delete_income") {
    const clientName = trimOrNull(parsed.client_name);
    if (!clientName) return null;
    const projectName = trimOrNull(parsed.project_name);
    const amount =
      parsed.amount == null
        ? null
        : typeof parsed.amount === "number"
          ? parsed.amount
          : Number(parsed.amount ?? NaN);
    if (amount != null && (!Number.isFinite(amount) || amount <= 0)) return null;
    const date = normalizeRelativeDate(trimOrNull(parsed.date));
    return {
      action: "delete_income",
      client_name: clientName,
      project_name: projectName,
      date,
      amount,
    };
  }
  if (parsed.action === "delete_client") {
    const clientName = trimOrNull(parsed.client_name);
    if (!clientName) return null;
    const force = Boolean(parsed.force);
    return {
      action: "delete_client",
      client_name: clientName,
      force,
    };
  }
  if (parsed.action === "create_company") {
    const companyName = trimOrNull(parsed.company_name);
    if (!companyName) return null;
    return {
      action: "create_company",
      company_name: companyName,
    };
  }
  if (parsed.action === "create_clients") {
    const rawClients = Array.isArray(parsed.clients) ? parsed.clients : [];
    const clients = rawClients
      .map((c) => c as Record<string, unknown>)
      .map((c) => ({
        name: trimOrNull(c.name),
        email: trimOrNull(c.email),
        notes: trimOrNull(c.notes),
      }))
      .filter((c) => Boolean(c.name)) as Array<{
      name: string;
      email: string | null;
      notes: string | null;
    }>;
    if (!clients.length) return null;
    return {
      action: "create_clients",
      clients,
      company_name: trimOrNull(parsed.company_name),
    };
  }
  if (parsed.action === "create_project") {
    const clientName = trimOrNull(parsed.client_name);
    const projectName = trimOrNull(parsed.project_name);
    if (!clientName || !projectName) return null;
    const status = (trimOrNull(parsed.status) ?? "active").toLowerCase();
    const startDate = normalizeRelativeDate(trimOrNull(parsed.start_date));
    const endDate = trimOrNull(parsed.end_date)
      ? normalizeRelativeDate(trimOrNull(parsed.end_date))
      : null;
    return {
      action: "create_project",
      client_name: clientName,
      project_name: projectName,
      status,
      start_date: startDate,
      end_date: endDate,
    };
  }
  if (parsed.action === "update_project_status") {
    const clientName = trimOrNull(parsed.client_name);
    const projectName = trimOrNull(parsed.project_name);
    if (!clientName || !projectName) return null;
    const status = (trimOrNull(parsed.status) ?? "finished").toLowerCase();
    const endDate = normalizeRelativeDate(trimOrNull(parsed.end_date));
    return {
      action: "update_project_status",
      client_name: clientName,
      project_name: projectName,
      status,
      end_date: endDate,
    };
  }
  if (parsed.action === "delete_project") {
    const clientName = trimOrNull(parsed.client_name);
    const projectName = trimOrNull(parsed.project_name);
    if (!clientName || !projectName) return null;
    return {
      action: "delete_project",
      client_name: clientName,
      project_name: projectName,
    };
  }
  if (parsed.action === "add_mileage") {
    const date = normalizeRelativeDate(trimOrNull(parsed.date));
    const templateId = trimOrNull(parsed.template_id);
    const notes = trimOrNull(parsed.notes);
    if (templateId) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          templateId,
        )
      ) {
        return null;
      }
      return {
        action: "add_mileage",
        date,
        template_id: templateId,
        trip_type: null,
        start_location: null,
        end_location: null,
        leg_distance_km: null,
        notes,
      };
    }
    const tripRaw = (trimOrNull(parsed.trip_type) ?? "one_way").toLowerCase();
    const trip_type: "one_way" | "round_trip" =
      tripRaw === "round_trip" ? "round_trip" : "one_way";
    const leg =
      typeof parsed.leg_distance_km === "number"
        ? parsed.leg_distance_km
        : Number(parsed.leg_distance_km ?? NaN);
    if (!Number.isFinite(leg) || leg <= 0) return null;
    const end_location = trimOrNull(parsed.end_location);
    if (!end_location) return null;
    return {
      action: "add_mileage",
      date,
      template_id: null,
      trip_type,
      start_location: trimOrNull(parsed.start_location),
      end_location,
      leg_distance_km: leg,
      notes,
    };
  }
  if (parsed.action === "add_hours") {
    const project_name = trimOrNull(parsed.project_name);
    const client_name = trimOrNull(parsed.client_name);
    if (!project_name && !client_name) return null;

    const date = normalizeRelativeDate(trimOrNull(parsed.date));
    const start_time = normalizeTimeOfDay(trimOrNull(parsed.start_time));
    const end_time = normalizeTimeOfDay(trimOrNull(parsed.end_time));

    const duration_hours =
      parsed.duration_hours == null
        ? null
        : typeof parsed.duration_hours === "number"
          ? parsed.duration_hours
          : Number(parsed.duration_hours ?? NaN);

    const durOk =
      duration_hours == null ||
      (Number.isFinite(duration_hours) && duration_hours > 0 && duration_hours <= 24);
    if (!durOk) return null;

    if ((!start_time || !end_time) && duration_hours == null) return null;

    return {
      action: "add_hours",
      project_name,
      client_name,
      date,
      start_time,
      end_time,
      duration_hours: duration_hours == null ? null : duration_hours,
      notes: trimOrNull(parsed.notes),
    };
  }
  if (parsed.action === "add_business_expense") {
    const amount =
      typeof parsed.amount === "number" ? parsed.amount : Number(parsed.amount ?? NaN);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const currency = trimOrNull(parsed.currency);
    const date = normalizeRelativeDate(trimOrNull(parsed.date));
    const category = trimOrNull(parsed.category);
    const notes = trimOrNull(parsed.notes);
    return {
      action: "add_business_expense",
      amount,
      currency,
      date,
      category,
      notes,
    };
  }
  if (parsed.action === "add_business_expense_from_template") {
    const template_id = trimOrNull(parsed.template_id);
    const template_search = trimOrNull(parsed.template_search);
    if (!template_id && !template_search) return null;

    if (
      template_id &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        template_id,
      )
    ) {
      return null;
    }

    const amount =
      parsed.amount == null ? null : typeof parsed.amount === "number" ? parsed.amount : Number(parsed.amount ?? NaN);
    if (amount != null && (!Number.isFinite(amount) || amount <= 0)) return null;

    return {
      action: "add_business_expense_from_template",
      template_id,
      template_search,
      amount: amount == null ? null : amount,
      date: trimOrNull(parsed.date),
      notes: trimOrNull(parsed.notes),
    };
  }
  return null;
}

function parseAssistantJson(raw: string): AiActionResponse[] | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Backward compatible: single action object.
    if ("action" in parsed) {
      const one = parseSingleAction(parsed);
      return one ? [one] : null;
    }
    // New format: { actions: [...] }
    const rawActions = Array.isArray(parsed.actions) ? parsed.actions : null;
    if (!rawActions?.length) return null;
    const parsedActions = rawActions
      .map((a) => (a && typeof a === "object" ? parseSingleAction(a as Record<string, unknown>) : null))
      .filter(Boolean) as AiActionResponse[];
    if (!parsedActions.length) return null;
    return parsedActions;
  } catch {
    return null;
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

/** Keys the AI assistant client reads on success and error responses. */
function usageResponseFields(u: UsageMeta) {
  return {
    usedToday: u.daily_used,
    maxPerDay: u.daily_limit,
    remaining: Math.max(0, u.daily_limit - u.daily_used),
    daily_used: u.daily_used,
    daily_limit: u.daily_limit,
    remaining_budget: u.remaining_budget,
  };
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const dailyLimit = getAiDailyCap(plan);
  const monthlyBudgetCap = getAiMonthlyBudgetCap(plan);
  if (dailyLimit === 0) {
    return NextResponse.json({
      usedToday: 0,
      maxPerDay: 0,
      remaining: 0,
      remaining_budget: 0,
      daily_used: 0,
      daily_limit: 0,
    });
  }
  const { data: row } = await supabase
    .from("user_ai_usage")
    .select("daily_requests,monthly_cost")
    .eq("user_id", user.id)
    .maybeSingle();

  const usedToday = Number((row as any)?.daily_requests ?? 0);
  const monthlyCost = Number((row as any)?.monthly_cost ?? 0);
  return NextResponse.json({
    usedToday,
    maxPerDay: dailyLimit,
    remaining: Math.max(0, dailyLimit - usedToday),
    remaining_budget: Math.max(0, monthlyBudgetCap - monthlyCost),
    daily_used: usedToday,
    daily_limit: dailyLimit,
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { message?: unknown } | null;
  const validated = validateAiAssistantInput(body?.message);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const message = validated.value;

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on server." },
      { status: 500 },
    );
  }

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const maxPerDay = getAiDailyCap(plan);
  const monthlyCostCap = getAiMonthlyBudgetCap(plan);

  if (maxPerDay === 0) {
    return NextResponse.json(
      {
        error: "AI assistant is not available on your current plan.",
        usedToday: 0,
        maxPerDay: 0,
        remaining_budget: 0,
        daily_used: 0,
        daily_limit: 0,
      },
      { status: 403 },
    );
  }

  const clientIp = getClientIpFromRequest(req);
  const rl = checkRateLimits(user.id, clientIp);
  if (!rl.ok) {
    if (rl.reason === "user") {
      void incrementAiAbuseStrike(supabase, user.id);
    }
    return NextResponse.json({ error: rl.message }, { status: 429 });
  }

  const now = new Date();
  let usageRow = await getOrCreateUserAiUsageRow(supabase, user.id);
  usageRow = await applyResetsIfNeeded(supabase, usageRow, now);

  const caps = { dailyLimit: maxPerDay, monthlyBudgetCap: monthlyCostCap };
  if (usageRow.last_request_at) {
    const lastMs = new Date(usageRow.last_request_at).getTime();
    const elapsed = Date.now() - lastMs;
    if (Number.isFinite(lastMs) && elapsed >= 0 && elapsed < MIN_REQUEST_INTERVAL_MS) {
      return NextResponse.json(
        {
          error: "Please wait a moment before sending another request.",
          ...usageResponseFields(usageMetaFromRow(usageRow, caps)),
        },
        { status: 429 },
      );
    }
  }

  const { flagged } = await tryFetchAbuseColumns(supabase, user.id);
  updateRateLimits(user.id, clientIp);

  const { data: mileageTemplateRows } = await supabase
    .from("mileage_templates")
    .select("id,trip_type,start_location,end_location,distance_km,notes")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const { data: generalExpenseTemplateRows } = await supabase
    .from("general_expenses_templates")
    .select("id,amount,category,notes,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const mileageTemplatesPayload = JSON.stringify(
    (mileageTemplateRows ?? []).map((t) => ({
      id: t.id,
      start_location: (t as { start_location?: string | null }).start_location ?? "home",
      end_location: (t as { end_location?: string | null }).end_location ?? null,
      trip_type: String((t as { trip_type?: string | null }).trip_type ?? "one_way"),
      distance_km_stored: Number((t as { distance_km?: unknown }).distance_km ?? 0),
      notes: (t as { notes?: string | null }).notes ?? null,
    })),
  );

  const generalExpenseTemplatesPayload = JSON.stringify(
    (generalExpenseTemplateRows ?? []).map((t: any) => ({
      id: t.id,
      amount: Number(t.amount ?? 0),
      category: String(t.category ?? ""),
      notes: t.notes ?? null,
    })),
  );

  const mileagePromptAppend = `

ADD MILEAGE:
{
  "action": "add_mileage",
  "date": "today" | "yesterday" | "tomorrow" | "YYYY-MM-DD",
  "template_id": null | "<uuid from user mileage templates below>",
  "trip_type": "one_way" | "round_trip" | null,
  "start_location": string | null,
  "end_location": string | null,
  "leg_distance_km": number | null,
  "notes": string | null
}

Mileage rules:
- When template_id is set: only date + template_id are required (other fields may be null). Use when the user clearly refers to a saved route (e.g. "I went to sandro today" matches a template whose end_location is sandro).
- Free-form (template_id null): require leg_distance_km, end_location, trip_type. leg_distance_km is always the ONE-WAY / single-leg distance in km (same as the mileage form field). If the user says "X km one way" and also round trip / "and back" / "return", use trip_type "round_trip" and leg_distance_km = X (stored total km = 2*X). One-way trip without return: trip_type "one_way", leg_distance_km = full trip km.
- Parse routes: "from A to B", "A to B", "went from A to B": start_location A, end_location B. "huis"/"home" => you may output "home" for start_location.
- If the user includes notes like "Notes: ...", set "notes" to that string (remove surrounding quotes).
- Similar phrasing should yield the same JSON fields.

User mileage templates (authoritative ids for template_id):
${mileageTemplatesPayload}
`;

  const generalExpensesPromptAppend = `

ADD BUSINESS EXPENSE:
{
  "action": "add_business_expense",
  "amount": number,
  "currency": "EUR" | "USD" | "GBP" | string | null,
  "date": "today" | "yesterday" | "tomorrow" | "YYYY-MM-DD",
  "category": string | null,
  "notes": string | null
}

ADD BUSINESS EXPENSE FROM TEMPLATE:
{
  "action": "add_business_expense_from_template",
  "template_id": null | "<uuid from templates below>",
  "template_search": string | null,
  "amount": number | null,
  "date": "today" | "yesterday" | "tomorrow" | "YYYY-MM-DD" | null,
  "notes": string | null
}

Business expense rules:
- If the user indicates a business/general expense (e.g. "business expense", "general expense", "I spent"), use add_business_expense.
- If the user references a regular payment / template (e.g. "add transip payment"), use add_business_expense_from_template.
- Put any trailing context like "during <event>" or "Notes: <text>" into notes.
- If category is not explicitly stated, you may leave it null.

User general expense templates (authoritative ids for template_id):
${generalExpenseTemplatesPayload}
`;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const systemPrompt =
    'You convert user input into JSON actions.\n\nCRITICAL:\n- Return ONLY valid JSON (no prose).\n- Never calculate or invent results.\n- If the user is vague, choose the closest matching action.\n\nReturn JSON in this format:\n{\n  "actions": [\n    { "action": "..." }\n  ]\n}\n\n----------------------------------------\nEXISTING CRUD ACTIONS (keep working)\n----------------------------------------\nAvailable actions:\n- create_client\n- create_clients\n- update_client\n- add_income\n- delete_income\n- delete_client\n- create_company\n- create_project\n- update_project_status\n- delete_project\n- add_mileage\n- add_hours\n\nEach item in actions[] must match one of the existing shapes below.\n\nCREATE:\n{\n  "action": "create_client",\n  "name": "Client Name",\n  "email": null,\n  "company": null,\n  "notes": null\n}\n\nCREATE MULTIPLE CLIENTS WITH COMPANY:\n{\n  "action": "create_clients",\n  "clients": [\n    {\n      "name": "required",\n      "email": null,\n      "notes": null\n    }\n  ],\n  "company_name": "optional"\n}\n\nUPDATE:\n{\n  "action": "update_client",\n  "search_name": "existing client name",\n  "new_name": null,\n  "email": null,\n  "company": null,\n  "notes": null\n}\n\nCREATE PROJECT:\n{\n  "action": "create_project",\n  "client_name": "required",\n  "project_name": "required",\n  "status": "active",\n  "start_date": "today",\n  "end_date": null\n}\n\nUPDATE PROJECT STATUS:\n{\n  "action": "update_project_status",\n  "client_name": "required",\n  "project_name": "required",\n  "status": "finished",\n  "end_date": "today"\n}\n\nDELETE PROJECT:\n{\n  "action": "delete_project",\n  "client_name": "required",\n  "project_name": "required"\n}\n\nADD INCOME:\n{\n  "action": "add_income",\n  "client_name": "required",\n  "project_name": null,\n  "amount": number,\n  "currency": "EUR",\n  "date": "YYYY-MM-DD",\n  "description": null\n}\n\nDELETE INCOME:\n{\n  "action": "delete_income",\n  "client_name": "required",\n  "project_name": null,\n  "date": "YYYY-MM-DD",\n  "amount": null\n}\n\nDELETE CLIENT:\n{\n  "action": "delete_client",\n  "client_name": "required",\n  "force": false\n}\n\nCREATE COMPANY:\n{\n  "action": "create_company",\n  "company_name": "required"\n}\n\nADD HOURS (time tracking):\n{\n  "action": "add_hours",\n  "project_name": null,\n  "client_name": null,\n  "date": "today" | "yesterday" | "tomorrow" | "YYYY-MM-DD",\n  "start_time": "HH:MM",\n  "end_time": "HH:MM",\n  "duration_hours": null,\n  "notes": null\n}\n\nHours rules:\n- Prefer 24h times for start_time/end_time (e.g. 13:00, 19:00).\n- If the user provides a duration instead of a full range, you may set duration_hours and include either start_time OR end_time.\n- If the user says "to project <name>" set project_name and leave client_name null.\n- If the user says only a client, set client_name and leave project_name null.\n- If date is not mentioned, use "today".\n\n----------------------------------------\nFINANCE / PROJECTS / TIME QUERIES (NEW)\n----------------------------------------\nThese actions MUST use the shape:\n{\n  "action": "action_name",\n  "parameters": {\n    "year": number?,\n    "month": number | "this_month" | "last_month"?,\n    "period": "this_month" | "last_month" | "this_year" | "last_year"?,\n    "project_name": string?,\n    "limit": number?\n  }\n}\n\nSupported query actions:\nFinance:\n- get_best_month\n- get_worst_month\n- get_total_income\n- get_total_expenses\n- get_profit\n- get_average_monthly_income\n- compare_periods\n\nProjects:\n- get_top_projects\n- get_project_revenue\n- get_best_project\n\nTime tracking:\n- get_total_hours\n- get_project_hours\n\nFlexible interpretation examples:\n- "When did I make the most?" -> get_best_month\n- "Total earnings this year" -> get_total_income with { "period": "this_year" }\n- "How much did I earn last year in November?" -> get_total_income with { "year": <last year as a 4-digit number>, "month": 11 } (if the user names a specific month, use year+month for that single calendar month; do NOT use "period": "last_year" for that — that would mean the full year)\n- "Compare this month to last month" -> compare_periods with { "period": "this_month" }\n- "Revenue from Kai" -> get_project_revenue with { "project_name": "Kai" }\n- "How many hours did I work last month?" -> get_total_hours with { "period": "last_month" }\n\nRules:\n- Always return JSON.\n- Never return unknown.\n- If unclear, best guess.\n\n---\n\nRules (existing):\n- Prefer MULTIPLE actions in actions[] when the user asks for more than one operation.\n- client_name is REQUIRED\n- For add_income: amount is REQUIRED\n- For delete_income: amount optional\n- project_name optional\n- description optional\n- currency default = EUR if not provided\n- date:\n  - if user says "today" -> use "today"\n  - if user says "yesterday" -> use "yesterday"\n  - if user says "tomorrow" -> use "tomorrow"\n  - if no date -> use "today"\n- For delete_client:\n  - set force=true only when user clearly says force delete / delete all data\n- If user says delete project / remove project / delete [project name] / delete [project] from [client], ALWAYS use delete_project (not delete_income)\n- If the input references a known project name, prioritize project actions over income actions' +
    mileagePromptAppend +
    generalExpensesPromptAppend;

  if (flagged) {
    const delayMs =
      FLAGGED_REQUEST_DELAY_MIN_MS +
      Math.floor(
        Math.random() * (FLAGGED_REQUEST_DELAY_MAX_MS - FLAGGED_REQUEST_DELAY_MIN_MS + 1),
      );
    await new Promise((r) => setTimeout(r, delayMs));
  }

  const result = await handleAIRequest(supabase as any, user.id, message, {
    limits: { dailyCap: maxPerDay, monthlyCostCap },
    abuse: { flagged },
    callAi: async ({ max_tokens }) => {
      const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
        }),
      });

      if (!openAiRes.ok) {
        const errTxt = await openAiRes.text().catch(() => "");
        return { ok: false, error: "OpenAI request failed.", status: 502, details: errTxt || undefined };
      }

      const payload = (await openAiRes.json().catch(() => null)) as any;
      const content = payload?.choices?.[0]?.message?.content?.trim() ?? "";
      const parsedActions = parseAssistantJson(content);
      if (!parsedActions?.length) {
        return { ok: false, error: "AI response invalid.", status: 422 };
      }
      const promptTokens = Number(payload?.usage?.prompt_tokens ?? 0);
      const completionTokens = Number(payload?.usage?.completion_tokens ?? 0);
      const totalTokens =
        Number.isFinite(promptTokens) && Number.isFinite(completionTokens)
          ? promptTokens + completionTokens
          : 0;
      return { ok: true, actions: parsedActions, tokens_used: totalTokens, raw: payload };
    },
  });

  const DAILY_CAP_MESSAGE = "You've reached your daily AI limit. Try again tomorrow.";
  if (!result.ok && result.status === 429 && result.error === DAILY_CAP_MESSAGE) {
    void incrementAiAbuseStrike(supabase, user.id);
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.usage ? usageResponseFields(result.usage) : {}),
      },
      { status: result.status },
    );
  }

  const requiresCaptcha = getRequiresCaptchaAfterRequest(user.id);

  if (result.kind === "db_only") {
    return NextResponse.json({
      answer: result.answer,
      actions: [],
      usage_meta: result.usage,
      usage: usageResponseFields(result.usage),
      ...(requiresCaptcha ? { requiresCaptcha: true } : {}),
    });
  }

  return NextResponse.json({
    actions: result.actions,
    usage_meta: result.usage,
    usage: usageResponseFields(result.usage),
    ...(requiresCaptcha ? { requiresCaptcha: true } : {}),
  });
}

