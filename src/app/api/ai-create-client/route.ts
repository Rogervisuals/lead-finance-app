import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiDailyCap } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";

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
  | AiAddMileageResponse;

const MAX_WORDS = 45;
const COOLDOWN_SECONDS = 3;

type UsageRow = {
  user_id: string;
  date: string;
  requests_count: number;
  last_request_at: string | null;
};

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

function parseSingleAction(parsed: Record<string, unknown>): AiActionResponse | null {
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

function wordCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const maxPerDay = getAiDailyCap(plan);
  if (maxPerDay === 0) {
    return NextResponse.json({
      usedToday: 0,
      maxPerDay: 0,
      remaining: 0,
    });
  }
  const unlimited = !Number.isFinite(maxPerDay) || maxPerDay === Number.POSITIVE_INFINITY;
  const effectiveCap = unlimited ? 1_000_000 : maxPerDay;

  const usageDate = todayIsoDate();
  const { data: row } = await supabase
    .from("user_ai_usage")
    .select("requests_count")
    .eq("user_id", user.id)
    .eq("date", usageDate)
    .maybeSingle();

  const usedToday = Number((row as { requests_count?: unknown } | null)?.requests_count ?? 0);
  return NextResponse.json({
    usedToday,
    maxPerDay: unlimited ? 1_000_000 : maxPerDay,
    remaining: Math.max(0, effectiveCap - usedToday),
  });
}

export async function POST(req: Request) {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on server." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return badRequest("Message is required.");
  if (wordCount(message) > MAX_WORDS) {
    return badRequest(`Message too long (max ${MAX_WORDS} words)`);
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const maxPerDay = getAiDailyCap(plan);
  const unlimited = !Number.isFinite(maxPerDay) || maxPerDay === Number.POSITIVE_INFINITY;
  const effectiveCap = unlimited ? 1_000_000 : maxPerDay;

  if (maxPerDay === 0) {
    return NextResponse.json(
      {
        error: "AI assistant is not available on your current plan.",
        usedToday: 0,
        maxPerDay: 0,
      },
      { status: 403 },
    );
  }

  const usageDate = todayIsoDate();
  const { data: usageRow, error: usageError } = await supabase
    .from("user_ai_usage")
    .select("user_id,date,requests_count,last_request_at")
    .eq("user_id", user.id)
    .eq("date", usageDate)
    .maybeSingle();

  if (usageError) {
    return NextResponse.json(
      { error: "Could not read usage limits." },
      { status: 500 },
    );
  }

  const usage = usageRow as UsageRow | null;
  const usedToday = Number(usage?.requests_count ?? 0);
  if (usedToday >= effectiveCap) {
    return NextResponse.json(
      {
        error: `Daily AI limit reached (${usedToday}/${unlimited ? "∞" : effectiveCap}). Try again tomorrow.`,
        usedToday,
        maxPerDay: unlimited ? 1_000_000 : maxPerDay,
      },
      { status: 429 },
    );
  }

  if (usage?.last_request_at) {
    const lastMs = new Date(usage.last_request_at).getTime();
    const nowMs = Date.now();
    const elapsedSec = (nowMs - lastMs) / 1000;
    if (Number.isFinite(lastMs) && elapsedSec < COOLDOWN_SECONDS) {
      const waitFor = Math.max(1, Math.ceil(COOLDOWN_SECONDS - elapsedSec));
      return NextResponse.json(
        { error: `Please wait ${waitFor}s before sending another request.` },
        { status: 429 },
      );
    }
  }

  const nextCount = usedToday + 1;
  const { error: upsertErr } = await supabase.from("user_ai_usage").upsert(
    {
      user_id: user.id,
      date: usageDate,
      requests_count: nextCount,
      last_request_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
  if (upsertErr) {
    return NextResponse.json(
      { error: "Could not update usage limits." },
      { status: 500 },
    );
  }

  const { data: mileageTemplateRows } = await supabase
    .from("mileage_templates")
    .select("id,trip_type,start_location,end_location,distance_km,notes")
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

  const mileagePromptAppend = `

ADD MILEAGE:
{
  "action": "add_mileage",
  "date": "today" | "yesterday" | "tomorrow" | "YYYY-MM-DD",
  "template_id": null | "<uuid from user mileage templates below>",
  "trip_type": "one_way" | "round_trip" | null,
  "start_location": string | null,
  "end_location": string | null,
  "leg_distance_km": number | null
}

Mileage rules:
- When template_id is set: only date + template_id are required (other fields may be null). Use when the user clearly refers to a saved route (e.g. "I went to sandro today" matches a template whose end_location is sandro).
- Free-form (template_id null): require leg_distance_km, end_location, trip_type. leg_distance_km is always the ONE-WAY / single-leg distance in km (same as the mileage form field). If the user says "X km one way" and also round trip / "and back" / "return", use trip_type "round_trip" and leg_distance_km = X (stored total km = 2*X). One-way trip without return: trip_type "one_way", leg_distance_km = full trip km.
- Parse routes: "from A to B", "A to B", "went from A to B": start_location A, end_location B. "huis"/"home" => you may output "home" for start_location.
- Similar phrasing should yield the same JSON fields.

User mileage templates (authoritative ids for template_id):
${mileageTemplatesPayload}
`;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You convert user input into JSON actions.\n\nAvailable actions:\n- create_client\n- create_clients\n- update_client\n- add_income\n- delete_income\n- delete_client\n- create_company\n- create_project\n- update_project_status\n- delete_project\n- add_mileage\n\n---\n\nReturn ONLY JSON in this format:\n{\n  "actions": [\n    { "action": "..." }\n  ]\n}\n\nEach item in actions[] must match one of these shapes:\n\nCREATE:\n{\n  "action": "create_client",\n  "name": "Client Name",\n  "email": null,\n  "company": null,\n  "notes": null\n}\n\nCREATE MULTIPLE CLIENTS WITH COMPANY:\n{\n  "action": "create_clients",\n  "clients": [\n    {\n      "name": "required",\n      "email": null,\n      "notes": null\n    }\n  ],\n  "company_name": "optional"\n}\n\nUPDATE:\n{\n  "action": "update_client",\n  "search_name": "existing client name",\n  "new_name": null,\n  "email": null,\n  "company": null,\n  "notes": null\n}\n\nCREATE PROJECT:\n{\n  "action": "create_project",\n  "client_name": "required",\n  "project_name": "required",\n  "status": "active",\n  "start_date": "today",\n  "end_date": null\n}\n\nUPDATE PROJECT STATUS:\n{\n  "action": "update_project_status",\n  "client_name": "required",\n  "project_name": "required",\n  "status": "finished",\n  "end_date": "today"\n}\n\nDELETE PROJECT:\n{\n  "action": "delete_project",\n  "client_name": "required",\n  "project_name": "required"\n}\n\nADD INCOME:\n{\n  "action": "add_income",\n  "client_name": "required",\n  "project_name": null,\n  "amount": number,\n  "currency": "EUR",\n  "date": "YYYY-MM-DD",\n  "description": null\n}\n\nDELETE INCOME:\n{\n  "action": "delete_income",\n  "client_name": "required",\n  "project_name": null,\n  "date": "YYYY-MM-DD",\n  "amount": null\n}\n\nDELETE CLIENT:\n{\n  "action": "delete_client",\n  "client_name": "required",\n  "force": false\n}\n\nCREATE COMPANY:\n{\n  "action": "create_company",\n  "company_name": "required"\n}\n\nRules:\n- Prefer MULTIPLE actions in actions[] when the user asks for more than one operation.\n- client_name is REQUIRED\n- For add_income: amount is REQUIRED\n- For delete_income: amount optional\n- project_name optional\n- description optional\n- currency default = EUR if not provided\n- date:\n  - if user says "today" -> use "today"\n  - if user says "yesterday" -> use "yesterday"\n  - if user says "tomorrow" -> use "tomorrow"\n  - if no date -> use "today"\n- For delete_client:\n  - set force=true only when user clearly says force delete / delete all data\n- If user says delete project / remove project / delete [project name] / delete [project] from [client], ALWAYS use delete_project (not delete_income)\n- If the input references a known project name, prioritize project actions over income actions' +
            mileagePromptAppend,
        },
        { role: "user", content: message },
      ],
    }),
  });

  if (!openAiRes.ok) {
    const errTxt = await openAiRes.text().catch(() => "");
    return NextResponse.json(
      { error: "OpenAI request failed.", details: errTxt || undefined },
      { status: 502 },
    );
  }

  const payload = (await openAiRes.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: { content?: string | null };
        }>;
      }
    | null;

  const content = payload?.choices?.[0]?.message?.content?.trim() ?? "";
  const parsedActions = parseAssistantJson(content);
  if (!parsedActions?.length) {
    return NextResponse.json(
      { error: "AI response invalid." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    actions: parsedActions,
    usage: {
      usedToday: nextCount,
      maxPerDay: unlimited ? 1_000_000 : maxPerDay,
      remaining: Math.max(0, effectiveCap - nextCount),
    },
  });
}

