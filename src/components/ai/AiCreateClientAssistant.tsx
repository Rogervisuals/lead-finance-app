"use client";

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient, getBrowserUserOnce } from "@/lib/supabase/client";
import { computeIncomeApproxSnapshot } from "@/lib/finance/income-approx-display";
import {
  mileageStoredDistanceKm,
  normalizeMileageLocationKey,
} from "@/lib/mileage/distance";

type AiCreateResponse = {
  action: "create_client";
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  usage?: UsageInfo;
};

type AiCreateClientsResponse = {
  action: "create_clients";
  clients: Array<{
    name: string;
    email: string | null;
    notes: string | null;
  }>;
  company_name: string | null;
  usage?: UsageInfo;
};

type AiUpdateResponse = {
  action: "update_client";
  search_name: string;
  new_name: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  usage?: UsageInfo;
};

type AiAddIncomeResponse = {
  action: "add_income";
  client_name: string;
  project_name: string | null;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  usage?: UsageInfo;
};

type AiDeleteIncomeResponse = {
  action: "delete_income";
  client_name: string;
  project_name: string | null;
  date: string;
  amount: number | null;
  usage?: UsageInfo;
};

type AiDeleteClientResponse = {
  action: "delete_client";
  client_name: string;
  force: boolean;
  usage?: UsageInfo;
};

type AiCreateCompanyResponse = {
  action: "create_company";
  company_name: string;
  usage?: UsageInfo;
};

type AiCreateProjectResponse = {
  action: "create_project";
  client_name: string;
  project_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  usage?: UsageInfo;
};

type AiUpdateProjectStatusResponse = {
  action: "update_project_status";
  client_name: string;
  project_name: string;
  status: string;
  end_date: string;
  usage?: UsageInfo;
};

type AiDeleteProjectResponse = {
  action: "delete_project";
  client_name: string;
  project_name: string;
  usage?: UsageInfo;
};

type AiAddMileageResponse = {
  action: "add_mileage";
  date: string;
  template_id: string | null;
  trip_type: "one_way" | "round_trip" | null;
  start_location: string | null;
  end_location: string | null;
  leg_distance_km: number | null;
  notes: string | null;
  usage?: UsageInfo;
};

type AiAddHoursResponse = {
  action: "add_hours";
  project_name: string | null;
  client_name: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_hours: number | null;
  notes: string | null;
  usage?: UsageInfo;
};

type AiAddBusinessExpenseResponse = {
  action: "add_business_expense";
  amount: number;
  currency: string | null;
  date: string;
  category: string | null;
  notes: string | null;
  usage?: UsageInfo;
};

type AiAddBusinessExpenseFromTemplateResponse = {
  action: "add_business_expense_from_template";
  template_id: string | null;
  template_search: string | null;
  amount: number | null;
  date: string | null;
  notes: string | null;
  usage?: UsageInfo;
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
  usage?: UsageInfo;
};

type AiResponse =
  | AiCreateResponse
  | AiCreateClientsResponse
  | AiCreateProjectResponse
  | AiUpdateProjectStatusResponse
  | AiDeleteProjectResponse
  | AiAddMileageResponse
  | AiAddHoursResponse
  | AiAddBusinessExpenseResponse
  | AiAddBusinessExpenseFromTemplateResponse
  | AiUpdateResponse
  | AiAddIncomeResponse
  | AiDeleteIncomeResponse
  | AiDeleteClientResponse
  | AiCreateCompanyResponse
  | AiQueryResponse;

type UsageInfo = {
  // Backward compatible
  usedToday?: number;
  maxPerDay?: number;
  remaining?: number;
  // New cost-control metadata
  remaining_budget?: number;
  daily_used?: number;
  daily_limit?: number;
};

const MAX_WORDS = 45;
const LOCAL_COOLDOWN_MS = 3000;

function AiAssistantAskHint() {
  return (
    <div className="group/ai-hint relative -mt-0.5 shrink-0">
      <button
        type="button"
        aria-label="How to ask the assistant"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700/90 bg-zinc-900/40 text-zinc-400 outline-none transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-sky-500/35"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-4"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
          />
        </svg>
      </button>
      <div
        role="tooltip"
        className="invisible absolute right-0 top-full z-20 mt-1.5 max-h-[min(65dvh,26rem)] w-[min(19rem,calc(100vw-2.5rem))] overflow-y-auto overscroll-contain rounded-lg border border-zinc-700/90 bg-zinc-950 px-3 py-2.5 text-left text-xs leading-relaxed text-zinc-300 shadow-xl opacity-0 ring-1 ring-black/20 [-webkit-overflow-scrolling:touch] transition-opacity duration-150 group-hover/ai-hint:pointer-events-auto group-hover/ai-hint:visible group-hover/ai-hint:opacity-100 group-focus-within/ai-hint:pointer-events-auto group-focus-within/ai-hint:visible group-focus-within/ai-hint:opacity-100"
      >
        <p className="font-medium text-zinc-200">Tips for reliable results</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-300">
          <li>
            <strong>One short message</strong> per send (max {MAX_WORDS} words), with a single clear goal.
          </li>
          <li>
            <strong>Use exact names</strong> when you mean a client or project (match what you see in the app).
          </li>
          <li>
            <strong>Include numbers and dates</strong> for money or mileage (for example{" "}
            <span className="whitespace-nowrap text-zinc-300">500 EUR</span>,{" "}
            <span className="whitespace-nowrap text-zinc-300">today</span>,{" "}
            <span className="whitespace-nowrap text-zinc-300">yesterday</span>, or{" "}
            <span className="whitespace-nowrap text-zinc-300">2026-03-15</span>).
          </li>
          <li>
            <strong>Income and hours questions</strong> — ask in plain language for a month and year, for
            example how much you earned or how many hours you worked in November last year or February two
            years ago.
          </li>
        </ul>
        <div className="mt-3 border-t border-zinc-800/90 pt-2.5">
          <p className="text-xs font-medium text-zinc-200">Example messages</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Each box is one separate send. Replace the sample client, project, amounts, and dates with yours.
          </p>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Add a person or company you bill
              </p>
              <p className="mt-0.5 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5 text-[11px] leading-snug text-zinc-200">
                Add client Northwind Design
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Record money you received
              </p>
              <p className="mt-0.5 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5 text-[11px] leading-snug text-zinc-200">
                Add income 1200 EUR for Northwind Design yesterday for project Brand refresh
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Start work under a client
              </p>
              <p className="mt-0.5 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5 text-[11px] leading-snug text-zinc-200">
                Create project Website rebuild for Northwind Design, start today
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Log driving (Business plans, saved templates)
              </p>
              <p className="mt-0.5 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5 text-[11px] leading-snug text-zinc-200">
                Log mileage to Northwind Design using my home-to-office template
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Totals for a specific month (income or time)
              </p>
              <p className="mt-0.5 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5 text-[11px] leading-snug text-zinc-200">
                How much did I earn last year in November?
              </p>
              <p className="mt-1.5 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5 text-[11px] leading-snug text-zinc-200">
                How many hours did I work last year in February?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type AiInputHandle = {
  setValue: (next: string) => void;
};

type AiInputProps = {
  onSubmit: (message: string) => void;
  pending: boolean;
  maxWords: number;
  children?: ReactNode;
  actions?: ReactNode;
};

const AiInput = memo(
  forwardRef<AiInputHandle, AiInputProps>(function AiInput(
    { onSubmit, pending, maxWords, children, actions },
    ref,
  ) {
    const [input, setInput] = useState("");

    useImperativeHandle(
      ref,
      () => ({
        setValue: (next: string) => setInput(next),
      }),
      [],
    );

    function countWords(text: string) {
      const trimmed = text.trim();
      if (!trimmed) return 0;
      return trimmed.split(/\s+/).length;
    }

    function onSubmitForm(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      onSubmit(input);
    }

    const wordsNow = countWords(input);
    const tooLong = wordsNow > maxWords;

    return (
      <form onSubmit={onSubmitForm} className="mt-3 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          required
          rows={4}
          placeholder="Type a command..."
          disabled={pending}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500 disabled:opacity-60"
        />
        <p className="text-xs text-zinc-500">
          {wordsNow}/{maxWords} words
        </p>
        {children}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending || tooLong}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              {pending ? (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
              ) : null}
              {pending ? "Processing..." : "Run"}
            </span>
          </button>
          {actions}
        </div>
      </form>
    );
  }),
);

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function extractNotesFromMessage(message: string): string | null {
  const m = message.match(/\bnotes?\s*:\s*(.+)\s*$/i);
  if (!m) return null;
  let v = String(m[1] ?? "").trim();
  if (
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2) ||
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.length ? v : null;
}

function extractDuringFromMessage(message: string): string | null {
  const m = message.match(/\bduring\s+(.+?)(?:[.;]|$)/i);
  if (!m) return null;
  const v = String(m[1] ?? "").trim();
  return v.length ? v : null;
}

function extractExpenseContextFromMessage(message: string): string | null {
  // Try to preserve what the user actually said, e.g. "on parking during X"
  // -> "parking during X"
  const m = message.match(/\bon\s+(.+?)(?:\s+notes?\s*:|$)/i);
  if (!m) return null;
  const v = String(m[1] ?? "").trim();
  return v.length ? v : null;
}

function dedupeNotesParts(parts: string[]): string[] {
  const cleaned = parts
    .map((p) => p.trim())
    .filter(Boolean);
  const uniq: string[] = [];
  for (const p of cleaned) {
    const key = p.toLowerCase();
    if (!uniq.some((u) => u.toLowerCase() === key)) uniq.push(p);
  }
  // Remove parts that are strict substrings of another part (case-insensitive)
  return uniq.filter((p) => {
    const pl = p.toLowerCase();
    return !uniq.some((other) => other !== p && other.toLowerCase().includes(pl));
  });
}

function inferBusinessExpenseCategory(messageLower: string): string | null {
  if (/\bparking\b/.test(messageLower)) return "Transport";
  if (/\b(train|tram|bus|taxi|uber|bolt|flight|parking|fuel|gas|petrol)\b/.test(messageLower))
    return "Transport";
  if (/\b(food|lunch|dinner|restaurant|coffee)\b/.test(messageLower)) return "Food (business)";
  if (/\b(event|conference|meetup|ticket)\b/.test(messageLower)) return "events";
  return null;
}

function isAiResponse(v: unknown): v is AiResponse {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (r.action === "create_client") return typeof r.name === "string";
  if (r.action === "create_clients") return Array.isArray(r.clients);
  if (r.action === "update_client") return typeof r.search_name === "string";
  if (r.action === "add_income")
    return typeof r.client_name === "string" && typeof r.amount === "number";
  if (r.action === "delete_income") return typeof r.client_name === "string";
  if (r.action === "delete_client") return typeof r.client_name === "string";
  if (r.action === "create_company") return typeof r.company_name === "string";
  if (r.action === "create_project")
    return typeof r.client_name === "string" && typeof r.project_name === "string";
  if (r.action === "update_project_status")
    return typeof r.client_name === "string" && typeof r.project_name === "string";
  if (r.action === "delete_project")
    return typeof r.client_name === "string" && typeof r.project_name === "string";
  if (r.action === "add_mileage") {
    if (typeof r.date !== "string") return false;
    const tid = typeof r.template_id === "string" ? r.template_id.trim() : "";
    if (tid) return true;
    return (
      typeof r.leg_distance_km === "number" &&
      (r.trip_type === "one_way" || r.trip_type === "round_trip")
    );
  }
  if (r.action === "add_hours") {
    return (
      typeof r.date === "string" &&
      (typeof r.project_name === "string" || r.project_name === null) &&
      (typeof r.client_name === "string" || r.client_name === null)
    );
  }
  if (r.action === "add_business_expense") {
    return typeof r.amount === "number" && typeof r.date === "string";
  }
  if (r.action === "add_business_expense_from_template") {
    return (
      (typeof r.template_id === "string" || r.template_id === null) &&
      (typeof r.template_search === "string" || r.template_search === null)
    );
  }
  if (
    typeof r.action === "string" &&
    [
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
    ].includes(r.action)
  ) {
    return r.parameters != null && typeof r.parameters === "object";
  }
  return false;
}

function normalizeIsoDate(input: string | null | undefined): string {
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

function currencySymbol(currency: string) {
  const c = currency.trim().toUpperCase();
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

const WORD_TO_MONTH: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function parseMonthNameFromMessage(mLower: string): number | null {
  const keys = Object.keys(WORD_TO_MONTH).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (new RegExp(`\\b${k}\\b`, "i").test(mLower)) {
      return WORD_TO_MONTH[k] ?? null;
    }
  }
  return null;
}

function yearForMostRecentPastMonth(
  currentYear: number,
  currentMonth0: number,
  targetMonth1to12: number
) {
  const t0 = targetMonth1to12 - 1;
  if (currentMonth0 > t0) return currentYear;
  if (currentMonth0 < t0) return currentYear - 1;
  return currentYear - 1;
}

/**
 * Fills in `year` + numeric `month` from natural language so we are not fully
 * dependent on the model (e.g. "last year in November" should not become a full-year range).
 */
function enrichQueryParamsFromUserMessage(
  message: string,
  params: AiQueryParameters
): AiQueryParameters {
  const mLower = message.toLowerCase();
  const now = new Date();
  const cy = now.getFullYear();
  const m0 = now.getMonth();

  const monthFromText = parseMonthNameFromMessage(mLower);
  if (monthFromText == null) return params;

  const explicitYear = mLower.match(/\b(20[0-9]{2})\b/);
  let year: number;
  if (explicitYear) {
    year = Number(explicitYear[1]);
  } else if (/\blast\s+year\b/.test(mLower)) {
    year = cy - 1;
  } else if (/\bthis\s+year\b/.test(mLower)) {
    year = cy;
  } else if (params.period === "last_year") {
    year = cy - 1;
  } else if (params.period === "this_year") {
    year = cy;
  } else if (typeof params.year === "number" && Number.isFinite(params.year)) {
    year = params.year;
  } else {
    year = yearForMostRecentPastMonth(cy, m0, monthFromText);
  }

  return {
    ...params,
    year,
    month: monthFromText,
    period: undefined,
  };
}

function resolveQueryRange(params: AiQueryParameters) {
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();

  const mk = (yy: number, mm0: number) => ({
    start: new Date(yy, mm0, 1),
    endExclusive: new Date(yy, mm0 + 1, 1),
  });

  // Specific calendar month always wins over "this year" / "last year" (full-year ranges)
  if (
    typeof params.year === "number" &&
    Number.isFinite(params.year) &&
    typeof params.month === "number" &&
    params.month >= 1 &&
    params.month <= 12
  ) {
    return mk(params.year, params.month - 1);
  }
  if (params.period === "this_month" || params.month === "this_month") return mk(y, m0);
  if (params.period === "last_month" || params.month === "last_month") return mk(y, m0 - 1);
  if (params.period === "this_year")
    return { start: new Date(y, 0, 1), endExclusive: new Date(y + 1, 0, 1) };
  if (params.period === "last_year")
    return { start: new Date(y - 1, 0, 1), endExclusive: new Date(y, 0, 1) };
  if (typeof params.year === "number" && Number.isFinite(params.year))
    return { start: new Date(params.year, 0, 1), endExclusive: new Date(params.year + 1, 0, 1) };
  return mk(y, m0);
}

function toIsoDateOnly(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function normalizeSearchText(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseTimeOfDay(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  // Accept "13:00" or "13.00" or "1300"
  const m24 =
    raw.match(/^(\d{1,2})(?::|\.)(\d{2})$/) ?? raw.match(/^(\d{2})(\d{2})$/);
  if (m24) {
    const hh = Number(m24[1]);
    const mm = Number(m24[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }
  // Accept "1pm" / "1:30pm"
  const m12 = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2] ?? "0");
    const ap = m12[3];
    if (!(hh >= 1 && hh <= 12 && mm >= 0 && mm <= 59)) return null;
    if (ap === "am") hh = hh === 12 ? 0 : hh;
    if (ap === "pm") hh = hh === 12 ? 12 : hh + 12;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  return null;
}

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

function cleanSearch(input: string) {
  const cleaned = input
    .toLowerCase()
    .replace(/\b(the|project|for|client)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || input.trim().toLowerCase();
}

function matchesAllTokens(name: string, normalizedTokens: string[]) {
  const hay = normalizeSearchText(name);
  return normalizedTokens.every((t) => hay.includes(t));
}

function formatMultipleMatchesError(label: "Client" | "Project", names: string[]) {
  return `Multiple matches found:\n- ${names.join("\n- ")}\n\nPlease be more specific`;
}

export function AiCreateClientAssistant({
  canUseAi = true,
}: {
  canUseAi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inlineAnswer, setInlineAnswer] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<AiInputHandle | null>(null);
  const setInput = (next: string) => inputRef.current?.setValue(next);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 2600);
    return () => window.clearTimeout(id);
  }, [success]);

  function closeModal() {
    setOpen(false);
    setError(null);
    setUsageLoading(false);
  }

  function openModal() {
    setError(null);
    setOpen(true);
    if (!canUseAi) return;
    if (usage === null) setUsageLoading(true);
    void refreshUsage().finally(() => setUsageLoading(false));
  }

  async function refreshUsage() {
    const res = await fetch("/api/ai-create-client", { method: "GET" });
    if (!res.ok) return;
    const payload = (await res.json().catch(() => null)) as UsageInfo | null;
    if (!payload) return;
    if (
      typeof payload.daily_used === "number" ||
      typeof payload.usedToday === "number" ||
      typeof payload.remaining_budget === "number"
    ) {
      setUsage(payload);
    }
  }

  function countWords(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  async function handleCreateClientFlow(message: string) {
    setInlineAnswer(null);
    const aiRes = await fetch("/api/ai-create-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const aiEnvelope = (await aiRes.json().catch(() => ({}))) as unknown;
    if (!aiRes.ok) {
      const maybeUsage = (aiEnvelope as { usedToday?: unknown; maxPerDay?: unknown }) ?? {};
      if (
        typeof maybeUsage.usedToday === "number" &&
        typeof maybeUsage.maxPerDay === "number"
      ) {
        setUsage({
          usedToday: maybeUsage.usedToday,
          maxPerDay: maybeUsage.maxPerDay,
          remaining: Math.max(0, maybeUsage.maxPerDay - maybeUsage.usedToday),
        });
      }
      throw new Error(
        typeof (aiEnvelope as { error?: unknown })?.error === "string"
          ? ((aiEnvelope as { error?: unknown }).error as string)
          : "AI request failed.",
      );
    }

    const directAnswer =
      typeof (aiEnvelope as any)?.answer === "string" ? String((aiEnvelope as any).answer) : null;
    if (directAnswer) {
      setInlineAnswer(directAnswer);
    }

    const actionsRaw = Array.isArray((aiEnvelope as { actions?: unknown }).actions)
      ? ((aiEnvelope as { actions?: unknown[] }).actions ?? [])
      : [aiEnvelope];
    const actionsToRun = actionsRaw.filter(isAiResponse) as AiResponse[];
    if (!directAnswer && !actionsToRun.length) {
      throw new Error("AI response invalid.");
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await getBrowserUserOnce();
    if (!user) throw new Error("You must be logged in.");
    const userId = user.id;
    const messageLower = message.toLowerCase();

    async function getUserBaseCurrency() {
      const { data } = await supabase
        .from("user_settings")
        .select("base_currency")
        .eq("user_id", userId)
        .maybeSingle();
      const base = String((data as any)?.base_currency ?? "EUR")
        .trim()
        .toUpperCase();
      return base || "EUR";
    }

    async function getFxRate(from: string, to: string) {
      const f = from.trim().toUpperCase();
      const t = to.trim().toUpperCase();
      if (!f || !t || f === t) return 1;
      const res = await fetch(
        `/api/fx-rate?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`,
      );
      const payload = (await res.json().catch(() => null)) as any;
      const rate = Number(payload?.rate ?? NaN);
      if (!res.ok || !Number.isFinite(rate) || rate <= 0) {
        throw new Error("Exchange rate unavailable");
      }
      return rate;
    }

    async function findSingleClientByFuzzyName(searchRaw: string) {
      const normalized = normalizeSearchText(cleanSearch(searchRaw));
      const tokens = normalized.split(" ").filter(Boolean);
      if (!tokens.length) throw new Error("Client not found");

      const first = tokens[0];
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,email,company_id,notes")
        .eq("user_id", userId)
        .ilike("name", `%${first}%`)
        .limit(30);
      if (error) throw new Error(error.message || "Client lookup failed.");

      let matches = (data ?? []).filter((c: any) =>
        matchesAllTokens(String(c.name ?? ""), tokens),
      );
      if (!matches.length) {
        // Fallback: match if ANY cleaned token exists.
        matches = (data ?? []).filter((c: any) => {
          const hay = normalizeSearchText(String(c.name ?? ""));
          return tokens.some((t) => hay.includes(t));
        });
      }

      if (!matches.length) throw new Error("Client/project not found");
      if (matches.length > 1) {
        throw new Error(
          formatMultipleMatchesError(
            "Client",
            matches.map((m: any) => String(m.name ?? "Unnamed")),
          ),
        );
      }
      return matches[0] as {
        id: string;
        name: string;
        email: string | null;
        company_id: string | null;
        notes: string | null;
      };
    }

    async function findSingleProjectByFuzzyName(clientId: string, searchRaw: string) {
      const normalized = normalizeSearchText(cleanSearch(searchRaw));
      const tokens = normalized.split(" ").filter(Boolean);
      if (!tokens.length) throw new Error("Project not found");
      console.log("Searching project:", normalized);

      const first = tokens[0];
      const { data, error } = await supabase
        .from("projects")
        .select("id,name")
        .eq("client_id", clientId)
        .eq("user_id", userId)
        .ilike("name", `%${first}%`)
        .limit(30);
      if (error) throw new Error(error.message || "Project lookup failed.");

      let matches = (data ?? []).filter((p: any) =>
        matchesAllTokens(String(p.name ?? ""), tokens),
      );
      if (!matches.length) {
        // Fallback: match if ANY cleaned token exists.
        matches = (data ?? []).filter((p: any) => {
          const hay = normalizeSearchText(String(p.name ?? ""));
          return tokens.some((t) => hay.includes(t));
        });
      }

      if (!matches.length) throw new Error("Project not found");
      if (matches.length > 1) {
        throw new Error("Multiple projects found, be more specific");
      }
      return matches[0] as { id: string; name: string };
    }

    async function findSingleProjectByFuzzyNameAny(searchRaw: string) {
      const normalized = normalizeSearchText(cleanSearch(searchRaw));
      const tokens = normalized.split(" ").filter(Boolean);
      if (!tokens.length) throw new Error("Project not found");

      const first = tokens[0];
      const { data, error } = await supabase
        .from("projects")
        .select("id,name,client_id")
        .eq("user_id", userId)
        .ilike("name", `%${first}%`)
        .limit(30);
      if (error) throw new Error(error.message || "Project lookup failed.");

      let matches = (data ?? []).filter((p: any) =>
        matchesAllTokens(String(p.name ?? ""), tokens),
      );
      if (!matches.length) {
        matches = (data ?? []).filter((p: any) => {
          const hay = normalizeSearchText(String(p.name ?? ""));
          return tokens.some((t) => hay.includes(t));
        });
      }

      if (!matches.length) throw new Error("Project not found");
      if (matches.length > 1) {
        throw new Error(
          formatMultipleMatchesError(
            "Project",
            matches.map((m: any) => String(m.name ?? "Unnamed")),
          ),
        );
      }
      return matches[0] as { id: string; name: string; client_id: string };
    }

    async function findSingleCompanyByFuzzyName(searchRaw: string) {
      const normalized = normalizeSearchText(cleanSearch(searchRaw));
      const tokens = normalized.split(" ").filter(Boolean);
      if (!tokens.length) throw new Error("Company not found");

      const first = tokens[0];
      const { data, error } = await supabase
        .from("companies")
        .select("id,name")
        .eq("user_id", userId)
        .ilike("name", `%${first}%`)
        .limit(30);
      if (error) throw new Error(error.message || "Company lookup failed.");

      let matches = (data ?? []).filter((c: any) =>
        matchesAllTokens(String(c.name ?? ""), tokens),
      );
      if (!matches.length) {
        matches = (data ?? []).filter((c: any) => {
          const hay = normalizeSearchText(String(c.name ?? ""));
          return tokens.some((t) => hay.includes(t));
        });
      }

      if (!matches.length) throw new Error("Company not found");
      if (matches.length > 1) throw new Error("Multiple companies found");
      return matches[0] as { id: string; name: string };
    }

    const actionMessages: string[] = [];
    const queryMessages: string[] = [];
    const actionErrors: string[] = [];

    const runAction = async (aiPayload: AiResponse) => {
      if (aiPayload.action === "create_client") {
      const limitsRes = await fetch("/api/subscription/limits");
      const limits = (await limitsRes.json().catch(() => null)) as {
        canCreateClient?: boolean;
      } | null;
      if (!limitsRes.ok || !limits?.canCreateClient) {
        throw new Error(
          "Client limit reached for your plan. Remove a client or upgrade to add more.",
        );
      }

      const name = aiPayload.name.trim();
      if (!name) throw new Error("No client name found.");
      let companyId: string | null = null;
      const companyName = trimOrNull(aiPayload.company);
      if (companyName) {
        const company = await findSingleCompanyByFuzzyName(companyName);
        companyId = company.id;
      }

      const { error: insertError } = await supabase.from("clients").insert({
        user_id: userId,
        name,
        email: trimOrNull(aiPayload.email),
        company: null,
        ...(companyId ? { company_id: companyId } : {}),
        notes: trimOrNull(aiPayload.notes),
      });
      if (insertError) throw new Error(insertError.message || "Insert failed.");

      actionMessages.push(`Client created: ${name}`);
    } else if (aiPayload.action === "create_clients") {
      const clientsToCreate = (aiPayload.clients ?? [])
        .map((c) => ({
          name: String(c?.name ?? "").trim(),
          email: trimOrNull(c?.email),
          notes: trimOrNull(c?.notes),
        }))
        .filter((c) => c.name.length > 0);
      if (!clientsToCreate.length) {
        throw new Error("No valid clients provided");
      }

      const limitsRes = await fetch("/api/subscription/limits");
      const limits = (await limitsRes.json().catch(() => null)) as {
        clientCount?: number;
        maxClients?: number | null;
      } | null;
      if (!limitsRes.ok || !limits) {
        throw new Error("Could not verify subscription limits.");
      }
      const maxC = limits.maxClients;
      const cc = limits.clientCount ?? 0;
      if (
        maxC != null &&
        Number.isFinite(maxC) &&
        cc + clientsToCreate.length > maxC
      ) {
        throw new Error(
          "Client limit reached for your plan. Remove clients or upgrade to add more.",
        );
      }

      let companyId: string | null = null;
      let matchedCompanyName: string | null = null;
      const companyNameRaw = trimOrNull(aiPayload.company_name);
      if (companyNameRaw) {
        const company = await findSingleCompanyByFuzzyName(companyNameRaw);
        companyId = company.id;
        matchedCompanyName = company.name;
      }

      for (const c of clientsToCreate) {
        const payload = {
          user_id: userId,
          name: c.name,
          email: c.email,
          company: null,
          notes: c.notes,
          ...(companyId ? { company_id: companyId } : {}),
        };
        const { error: insErr } = await supabase.from("clients").insert(payload);
        if (insErr) throw new Error(insErr.message || "Insert failed.");
      }

      actionMessages.push(
        matchedCompanyName
          ? `${clientsToCreate.length} clients created and assigned to ${matchedCompanyName}`
          : `${clientsToCreate.length} clients created`,
      );
    } else if (aiPayload.action === "create_project") {
      const clientName = aiPayload.client_name.trim();
      const projectName = aiPayload.project_name.trim();
      if (!clientName) throw new Error("Client not found");
      if (!projectName) throw new Error("Project name is required");

      const client = await findSingleClientByFuzzyName(clientName);
      const status = (trimOrNull(aiPayload.status) ?? "active").toLowerCase();
      const startDate = normalizeIsoDate(aiPayload.start_date);
      const endDate = aiPayload.end_date ? normalizeIsoDate(aiPayload.end_date) : null;

      const { data: dupRows, error: dupErr } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", userId)
        .eq("client_id", client.id)
        .ilike("name", projectName)
        .limit(1);
      if (dupErr) throw new Error(dupErr.message || "Project lookup failed.");
      if ((dupRows ?? []).length > 0) {
        throw new Error("Project already exists");
      }

      const limitsRes = await fetch("/api/subscription/limits");
      const limits = (await limitsRes.json().catch(() => null)) as {
        canCreateProject?: boolean;
      } | null;
      if (!limitsRes.ok || !limits?.canCreateProject) {
        throw new Error(
          "Project limit reached for your plan. Remove a project or upgrade to add more.",
        );
      }

      const { error: createProjectErr } = await supabase.from("projects").insert({
        user_id: userId,
        client_id: client.id,
        name: projectName,
        status: status || "active",
        start_date: startDate,
        end_date: endDate,
      });
      if (createProjectErr) {
        throw new Error(createProjectErr.message || "Project create failed.");
      }
      actionMessages.push(`Project '${projectName}' created for ${client.name}`);
    } else if (aiPayload.action === "update_project_status") {
      const clientName = aiPayload.client_name.trim();
      const projectSearch = aiPayload.project_name.trim();
      if (!clientName) throw new Error("Client not found");
      if (!projectSearch) throw new Error("Project not found");

      const client = await findSingleClientByFuzzyName(clientName);
      const project = await findSingleProjectByFuzzyName(client.id, projectSearch);
      const status = (trimOrNull(aiPayload.status) ?? "finished").toLowerCase();
      const endDate = normalizeIsoDate(aiPayload.end_date);

      const { error: updateProjectErr } = await supabase
        .from("projects")
        .update({
          status,
          end_date: endDate,
        })
        .eq("id", project.id)
        .eq("user_id", userId);
      if (updateProjectErr) {
        throw new Error(updateProjectErr.message || "Project update failed.");
      }
      actionMessages.push(`Project '${project.name}' marked as finished`);
    } else if (aiPayload.action === "delete_project") {
      const clientName = aiPayload.client_name.trim();
      const projectSearch = aiPayload.project_name.trim();
      if (!clientName) throw new Error("Client not found");
      if (!projectSearch) throw new Error("Project not found");

      const client = await findSingleClientByFuzzyName(clientName);
      const project = await findSingleProjectByFuzzyName(client.id, projectSearch);

      const { error: deleteProjectErr } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq("user_id", userId);
      if (deleteProjectErr) {
        throw new Error(deleteProjectErr.message || "Project delete failed.");
      }
      actionMessages.push(`Project '${project.name}' deleted`);
    } else if (aiPayload.action === "update_client") {
      const searchName = aiPayload.search_name.trim();
      if (!searchName) throw new Error("No search_name provided.");
      const existing = await findSingleClientByFuzzyName(searchName);

      const nextName = trimOrNull(aiPayload.new_name) ?? existing.name;
      const nextEmail = aiPayload.email === null ? existing.email : trimOrNull(aiPayload.email);
      const nextNotes = aiPayload.notes === null ? existing.notes : trimOrNull(aiPayload.notes);
      let nextCompanyId = existing.company_id ?? null;
      if (aiPayload.company !== null) {
        const companyName = trimOrNull(aiPayload.company);
        if (companyName) {
          const company = await findSingleCompanyByFuzzyName(companyName);
          nextCompanyId = company.id;
        }
      }

      const { error: updateError } = await supabase
        .from("clients")
        .update({
          name: nextName,
          email: nextEmail,
          company: null,
          company_id: nextCompanyId,
          notes: nextNotes,
        })
        .eq("id", existing.id)
        .eq("user_id", userId);

      if (updateError) throw new Error(updateError.message || "Update failed.");
      actionMessages.push(`Client ${nextName} has been updated\nMatched client: ${existing.name}`);
    } else if (aiPayload.action === "add_income") {
      const clientName = aiPayload.client_name.trim();
      const amount = Number(aiPayload.amount ?? 0);
      if (!clientName) throw new Error("Client name is required");
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }
      const client = await findSingleClientByFuzzyName(clientName);

      let projectId: string | null = null;
      let matchedProjectName: string | null = null;
      const projectName = trimOrNull(aiPayload.project_name);
      if (projectName) {
        const project = await findSingleProjectByFuzzyName(client.id, projectName);
        projectId = project.id;
        matchedProjectName = project.name;
      }

      const currency = (trimOrNull(aiPayload.currency) ?? "EUR").toUpperCase();
      const parsedDate = normalizeIsoDate(aiPayload.date);
      const description = trimOrNull(aiPayload.description);

      const { data: finRow } = await supabase
        .from("user_settings")
        .select("comparison_currency")
        .eq("user_id", userId)
        .maybeSingle();
      const comparisonCurrency =
        String(finRow?.comparison_currency ?? "USD").trim().toUpperCase() || "USD";
      const approx = await computeIncomeApproxSnapshot({
        amountOriginal: amount,
        entryCurrency: currency,
        comparisonCurrency,
      });

      const { error: incomeError } = await supabase.from("income").insert({
        user_id: userId,
        client_id: client.id,
        project_id: projectId,
        amount_original: amount,
        currency,
        exchange_rate: 1,
        amount_converted: amount,
        date: parsedDate,
        description,
        approx_amount: approx?.approx_amount ?? null,
        approx_currency: approx?.approx_currency ?? null,
      });
      if (incomeError) throw new Error(incomeError.message || "Income insert failed.");

      actionMessages.push([
        `Income added: ${currencySymbol(currency)}${amount} for ${client.name}`,
        `Matched client: ${client.name}`,
        matchedProjectName ? `Matched project: ${matchedProjectName}` : null,
      ].filter(Boolean).join("\n"));
    } else if (aiPayload.action === "delete_income") {
      const clientName = aiPayload.client_name.trim();
      if (!clientName) throw new Error("Client name is required");
      const client = await findSingleClientByFuzzyName(clientName);

      let projectId: string | null = null;
      const projectName = trimOrNull(aiPayload.project_name);
      if (projectName) {
        const project = await findSingleProjectByFuzzyName(client.id, projectName);
        projectId = project.id;
      }

      const targetDate = normalizeIsoDate(aiPayload.date);
      const amountFilter =
        aiPayload.amount == null ? null : Number(aiPayload.amount);
      if (
        amountFilter != null &&
        (!Number.isFinite(amountFilter) || amountFilter <= 0)
      ) {
        throw new Error("Invalid amount");
      }

      console.log("Looking for date:", targetDate);

      let incomeQuery = supabase
        .from("income")
        .select("id,amount_original,currency")
        .eq("user_id", userId)
        .eq("client_id", client.id)
        .eq("date", targetDate);
      if (projectId != null) {
        incomeQuery = incomeQuery.eq("project_id", projectId);
      }
      const { data: incomeRows, error: incomeFindError } = await incomeQuery;

      if (incomeFindError) {
        throw new Error(incomeFindError.message || "Income lookup failed.");
      }

      const candidates = (incomeRows ?? []) as Array<{
        id: string;
        amount_original: number | string | null;
        currency: string | null;
      }>;

      const filtered =
        amountFilter == null
          ? candidates
          : candidates.filter((r) => {
              const n = Number(r.amount_original ?? 0);
              return Number.isFinite(n) && Math.abs(n - amountFilter) < 0.005;
            });

      if (!filtered.length) throw new Error("No income found");
      if (filtered.length > 1) {
        throw new Error("Multiple income entries found. Please be more specific.");
      }

      const target = filtered[0];
      const { error: delErr } = await supabase
        .from("income")
        .delete()
        .eq("id", target.id)
        .eq("user_id", userId);
      if (delErr) throw new Error(delErr.message || "Delete failed.");

      if (amountFilter != null) {
        const ccy = (target.currency ?? "EUR").toUpperCase();
        actionMessages.push(
          `Deleted ${currencySymbol(ccy)}${amountFilter} income for ${client.name}`,
        );
      } else {
        actionMessages.push(`Income deleted for ${client.name}`);
      }
    } else if (aiPayload.action === "delete_client") {
      const rawClientName = aiPayload.client_name.trim();
      if (!rawClientName) throw new Error("Client not found");

      const normalized = normalizeSearchText(cleanSearch(rawClientName));
      const tokens = normalized.split(" ").filter(Boolean);
      if (!tokens.length) throw new Error("Client not found");

      const first = tokens[0];
      const { data: possibleClients, error: clientErr } = await supabase
        .from("clients")
        .select("id,name")
        .eq("user_id", userId)
        .ilike("name", `%${first}%`)
        .limit(30);
      if (clientErr) throw new Error(clientErr.message || "Client lookup failed.");

      let clientMatches = (possibleClients ?? []).filter((c: any) =>
        matchesAllTokens(String(c.name ?? ""), tokens),
      );
      if (!clientMatches.length) {
        clientMatches = (possibleClients ?? []).filter((c: any) => {
          const hay = normalizeSearchText(String(c.name ?? ""));
          return tokens.some((t) => hay.includes(t));
        });
      }

      if (!clientMatches.length) throw new Error("Client not found");
      if (clientMatches.length > 1) {
        throw new Error("Multiple clients found. Be more specific.");
      }

      const client = clientMatches[0] as { id: string; name: string };

      const { data: projectRows, error: projectsErr } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", userId)
        .eq("client_id", client.id);
      if (projectsErr) throw new Error(projectsErr.message || "Project lookup failed.");
      const projectIds = (projectRows ?? [])
        .map((p: any) => String(p.id))
        .filter(Boolean);

      const [{ count: incomeCount, error: incomeErr }, { count: expensesCount, error: expensesErr }, { count: projectsCount, error: projectsCountErr }, { count: hoursCount, error: hoursErr }] =
        await Promise.all([
          supabase
            .from("income")
            .select("id", { head: true, count: "exact" })
            .eq("user_id", userId)
            .eq("client_id", client.id),
          supabase
            .from("expenses")
            .select("id", { head: true, count: "exact" })
            .eq("user_id", userId)
            .eq("client_id", client.id),
          supabase
            .from("projects")
            .select("id", { head: true, count: "exact" })
            .eq("user_id", userId)
            .eq("client_id", client.id),
          projectIds.length
            ? supabase
                .from("hours")
                .select("id", { head: true, count: "exact" })
                .eq("user_id", userId)
                .in("project_id", projectIds)
            : Promise.resolve({ count: 0, error: null } as any),
        ]);
      if (incomeErr || expensesErr || projectsCountErr || hoursErr) {
        throw new Error("Could not check related data.");
      }

      const hasRelatedData =
        Number(incomeCount ?? 0) > 0 ||
        Number(expensesCount ?? 0) > 0 ||
        Number(projectsCount ?? 0) > 0 ||
        Number(hoursCount ?? 0) > 0;

      const forceRequested =
        Boolean(aiPayload.force) ||
        /\b(force|all data|and all data)\b/.test(messageLower);

      if (hasRelatedData && !forceRequested) {
        throw new Error(
          "Client has existing data (projects/income/hours). Confirm deletion.",
        );
      }

      if (forceRequested) {
        if (projectIds.length) {
          const { error: delHoursErr } = await supabase
            .from("hours")
            .delete()
            .eq("user_id", userId)
            .in("project_id", projectIds);
          if (delHoursErr) throw new Error(delHoursErr.message || "Delete failed.");
        }

        const { error: delIncomeErr } = await supabase
          .from("income")
          .delete()
          .eq("user_id", userId)
          .eq("client_id", client.id);
        if (delIncomeErr) throw new Error(delIncomeErr.message || "Delete failed.");

        const { error: delExpensesErr } = await supabase
          .from("expenses")
          .delete()
          .eq("user_id", userId)
          .eq("client_id", client.id);
        if (delExpensesErr) throw new Error(delExpensesErr.message || "Delete failed.");

        const { error: delProjectsErr } = await supabase
          .from("projects")
          .delete()
          .eq("user_id", userId)
          .eq("client_id", client.id);
        if (delProjectsErr) throw new Error(delProjectsErr.message || "Delete failed.");
      }

      const { error: delClientErr } = await supabase
        .from("clients")
        .delete()
        .eq("user_id", userId)
        .eq("id", client.id);
      if (delClientErr) throw new Error(delClientErr.message || "Delete failed.");

      actionMessages.push(
        forceRequested
          ? `Client ${client.name} and all related data deleted`
          : `Client ${client.name} deleted`,
      );
    } else if (aiPayload.action === "add_mileage") {
      const limitsRes = await fetch("/api/subscription/limits");
      const limits = (await limitsRes.json().catch(() => null)) as {
        businessFeatures?: boolean;
      } | null;
      if (!limitsRes.ok || !limits?.businessFeatures) {
        throw new Error(
          "Mileage requires Business features (Basic or Pro). Upgrade your plan to log mileage.",
        );
      }

      const dateIso = normalizeIsoDate(aiPayload.date);
      const templateId = trimOrNull(aiPayload.template_id);
      const userNotes =
        trimOrNull(aiPayload.notes) ?? extractNotesFromMessage(message);

      if (templateId) {
        const { data: tmpl, error: tmplErr } = await supabase
          .from("mileage_templates")
          .select("trip_type,start_location,end_location,distance_km,notes,project_id")
          .eq("id", templateId)
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();
        if (tmplErr) throw new Error(tmplErr.message || "Template lookup failed.");
        if (!tmpl) throw new Error("Mileage template not found.");

        const tripType =
          String((tmpl as { trip_type?: string }).trip_type ?? "one_way").toLowerCase() ===
          "round_trip"
            ? "round_trip"
            : "one_way";
        const storedKm =
          Math.round(Number((tmpl as { distance_km?: unknown }).distance_km ?? 0) * 100) / 100;
        const startLoc =
          normalizeMileageLocationKey(
            String((tmpl as { start_location?: string | null }).start_location ?? ""),
          ) || "home";
        const endRaw = (tmpl as { end_location?: string | null }).end_location;
        const endLoc = endRaw
          ? normalizeMileageLocationKey(String(endRaw)) || null
          : null;

        const templateNotes = trimOrNull((tmpl as { notes?: string | null }).notes);
        const notes =
          templateNotes && userNotes
            ? `${templateNotes}\n${userNotes}`
            : userNotes ?? templateNotes;

        const { error: mErr } = await supabase.from("mileage").insert({
          user_id: userId,
          project_id: (tmpl as { project_id?: string | null }).project_id ?? null,
          date: dateIso,
          distance_km: storedKm,
          trip_type: tripType,
          start_location: startLoc,
          end_location: endLoc,
          notes,
        });
        if (mErr) throw new Error(mErr.message || "Mileage insert failed.");
        actionMessages.push(
          `Mileage logged from template · ${storedKm} km (${dateIso})`,
        );
      } else {
        const tripType =
          aiPayload.trip_type === "round_trip" ? "round_trip" : "one_way";
        const leg = Number(aiPayload.leg_distance_km ?? 0);
        if (!Number.isFinite(leg) || leg <= 0) {
          throw new Error("Invalid mileage distance");
        }
        const startLoc =
          normalizeMileageLocationKey(trimOrNull(aiPayload.start_location) ?? "") ||
            "home";
        const endRaw = trimOrNull(aiPayload.end_location);
        if (!endRaw) throw new Error("Mileage destination is required");
        const endLoc = normalizeMileageLocationKey(endRaw);
        if (!endLoc) throw new Error("Mileage destination is required");

        const storedKm = mileageStoredDistanceKm(tripType, leg);

        const { error: mErr } = await supabase.from("mileage").insert({
          user_id: userId,
          project_id: null,
          date: dateIso,
          distance_km: storedKm,
          trip_type: tripType,
          start_location: startLoc,
          end_location: endLoc,
          notes: userNotes,
        });
        if (mErr) throw new Error(mErr.message || "Mileage insert failed.");
        actionMessages.push(
          `Mileage logged · ${startLoc} → ${endLoc} · ${storedKm} km (${dateIso})`,
        );
      }
    } else if (aiPayload.action === "add_hours") {
      const dateIso = normalizeIsoDate(aiPayload.date);
      const startText = parseTimeOfDay(aiPayload.start_time);
      const endText = parseTimeOfDay(aiPayload.end_time);
      const dur =
        aiPayload.duration_hours == null ? null : Number(aiPayload.duration_hours);

      const durOk =
        dur == null || (Number.isFinite(dur) && dur > 0 && dur <= 24);
      if (!durOk) throw new Error("Invalid duration");

      let start: Date | null = null;
      let end: Date | null = null;

      if (startText) start = new Date(`${dateIso}T${startText}`);
      if (endText) end = new Date(`${dateIso}T${endText}`);

      if (dur != null && start && !end) {
        end = new Date(start.getTime() + dur * 60 * 60 * 1000);
      } else if (dur != null && end && !start) {
        start = new Date(end.getTime() - dur * 60 * 60 * 1000);
      }

      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("Invalid time range");
      }

      const diffMs = end.getTime() - start.getTime();
      const hours = roundTo2(diffMs / (1000 * 60 * 60));
      if (!(hours > 0)) throw new Error("End must be after start");

      const notes = trimOrNull(aiPayload.notes);

      let projectId: string | null = null;
      let clientId: string | null = null;
      let label: string | null = null;

      const projectNameRaw = trimOrNull(aiPayload.project_name);
      const clientNameRaw = trimOrNull(aiPayload.client_name);
      if (projectNameRaw) {
        const project = await findSingleProjectByFuzzyNameAny(projectNameRaw);
        projectId = project.id;
        clientId = project.client_id;
        label = `Matched project: ${project.name}`;
      } else if (clientNameRaw) {
        const client = await findSingleClientByFuzzyName(clientNameRaw);
        clientId = client.id;
        label = `Matched client: ${client.name}`;
      } else {
        throw new Error("Client/project not found");
      }

      const row = {
        user_id: userId,
        client_id: clientId!,
        project_id: projectId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        hours,
        notes,
      };

      const { error: insErr } = await supabase.from("hours").insert(row as any);
      if (insErr) {
        // Older DBs: hours row has project_id only (no client_id). Retry if a project was chosen.
        if (projectId) {
          const { error: insErr2 } = await supabase.from("hours").insert({
            user_id: userId,
            project_id: projectId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            hours,
            notes,
          } as any);
          if (!insErr2) {
            actionMessages.push(
              [`Hours logged: ${hours.toFixed(2)}h (${dateIso})`, label, notes ? `Notes: ${notes}` : null]
                .filter(Boolean)
                .join("\n"),
            );
            return;
          }
        }
        throw new Error(insErr.message || "Hours insert failed.");
      }

      actionMessages.push(
        [`Hours logged: ${hours.toFixed(2)}h (${dateIso})`, label, notes ? `Notes: ${notes}` : null]
          .filter(Boolean)
          .join("\n"),
      );
    } else if (aiPayload.action === "add_business_expense") {
      const base = await getUserBaseCurrency();
      const currency = (trimOrNull(aiPayload.currency) ?? base).toUpperCase();
      const amountOriginal = Number(aiPayload.amount ?? 0);
      if (!Number.isFinite(amountOriginal) || amountOriginal <= 0) {
        throw new Error("Invalid amount");
      }

      const dateIso = normalizeIsoDate(aiPayload.date);
      const category =
        trimOrNull(aiPayload.category) ??
        inferBusinessExpenseCategory(messageLower) ??
        "Online services";

      const notesParts = dedupeNotesParts(
        [
          trimOrNull(aiPayload.notes),
          extractNotesFromMessage(message),
          extractExpenseContextFromMessage(message),
          (() => {
            const during = extractDuringFromMessage(message);
            return during ? `during ${during}` : null;
          })(),
        ].filter(Boolean) as string[],
      );
      const notes = notesParts.length ? notesParts.join("\n") : null;

      const exchangeRate = currency === base ? 1 : await getFxRate(currency, base);
      const amountConverted = Math.round(amountOriginal * exchangeRate * 100) / 100;

      const { error: insErr } = await supabase.from("business_expenses").insert({
        user_id: userId,
        amount: amountConverted,
        amount_original: amountOriginal,
        currency,
        exchange_rate: exchangeRate,
        date: dateIso,
        category,
        notes,
      } as any);
      if (insErr) throw new Error(insErr.message || "Business expense insert failed.");

      actionMessages.push(
        [
          `Business expense added: ${fmtMoney(amountConverted, base)} (${currency} ${amountOriginal})`,
          `Category: ${category}`,
          notes ? `Notes: ${notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } else if (aiPayload.action === "add_business_expense_from_template") {
      const base = await getUserBaseCurrency();

      const dateIso = normalizeIsoDate(trimOrNull(aiPayload.date) ?? "today");
      const overrideNotes = dedupeNotesParts(
        [
          trimOrNull(aiPayload.notes),
          extractNotesFromMessage(message),
          extractExpenseContextFromMessage(message),
          (() => {
            const during = extractDuringFromMessage(message);
            return during ? `during ${during}` : null;
          })(),
        ].filter(Boolean) as string[],
      );
      const extraNotes = overrideNotes.length ? overrideNotes.join("\n") : null;

      const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);

      const resolveTemplate = async () => {
        const id = trimOrNull(aiPayload.template_id);
        if (id) {
          const { data, error } = await supabase
            .from("general_expenses_templates")
            .select("id,amount,category,notes,is_active")
            .eq("id", id)
            .eq("user_id", userId)
            .maybeSingle();
          if (error) throw new Error(error.message || "Template lookup failed.");
          if (!data || !(data as any).is_active) throw new Error("Template not found");
          return data as any;
        }

        const search = trimOrNull(aiPayload.template_search) ?? "";
        const normalized = normalizeSearchText(cleanSearch(search));
        const tokens = normalized.split(" ").filter(Boolean);
        if (!tokens.length) throw new Error("Template not found");

        const { data, error } = await supabase
          .from("general_expenses_templates")
          .select("id,amount,category,notes,is_active")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(50);
        if (error) throw new Error(error.message || "Template lookup failed.");

        const matches = (data ?? []).filter((t: any) => {
          const hay = normalizeSearchText(String(t.notes ?? ""));
          return tokens.every((tok) => hay.includes(tok));
        });

        if (!matches.length) throw new Error("Template not found");

        const wantAmount =
          aiPayload.amount == null ? null : Number(aiPayload.amount);
        if (wantAmount != null && Number.isFinite(wantAmount) && wantAmount > 0) {
          const byAmount = matches.filter((t: any) => cents(t.amount) === cents(wantAmount));
          if (byAmount.length === 1) return byAmount[0];
          if (byAmount.length > 1) {
            throw new Error(
              formatMultipleMatchesError(
                "Project",
                byAmount.map((t: any) => `${String(t.notes ?? "Template")} (${Number(t.amount ?? 0)})`),
              ),
            );
          }
        }

        if (matches.length > 1) {
          throw new Error(
            `Multiple templates matched. Add an amount to disambiguate.\n- ${matches
              .slice(0, 8)
              .map((t: any) => `${String(t.notes ?? "Template")} (${Number(t.amount ?? 0)})`)
              .join("\n- ")}`,
          );
        }
        return matches[0];
      };

      const tmpl = await resolveTemplate();
      const amt = Number((tmpl as any).amount ?? 0);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Invalid template amount");
      const category = String((tmpl as any).category ?? "").trim() || "Online services";
      const templateNotes = trimOrNull((tmpl as any).notes);
      const notes =
        templateNotes && extraNotes ? `${templateNotes}\n${extraNotes}` : extraNotes ?? templateNotes;

      const { error: insErr } = await supabase.from("business_expenses").insert({
        user_id: userId,
        amount: amt,
        amount_original: amt,
        currency: base,
        exchange_rate: 1,
        date: dateIso,
        category,
        notes,
      } as any);
      if (insErr) throw new Error(insErr.message || "Business expense insert failed.");

      actionMessages.push(
        [
          `Business expense added from template: ${fmtMoney(amt, base)}`,
          `Category: ${category}`,
          notes ? `Notes: ${notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } else if (
      [
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
      ].includes(aiPayload.action)
    ) {
      const params = (aiPayload as AiQueryResponse).parameters ?? {};
      const rangeParams = enrichQueryParamsFromUserMessage(message, params);
      const { start, endExclusive } = resolveQueryRange(rangeParams);
      const startIso = toIsoDateOnly(start);
      const endIso = toIsoDateOnly(new Date(endExclusive.getTime() - 24 * 3600 * 1000));

      const baseCurrency = "EUR";

      const sumIncome = async () => {
        const { data, error } = await supabase
          .from("income")
          .select("amount_converted,date")
          .eq("user_id", userId)
          .gte("date", startIso)
          .lte("date", endIso);
        if (error) throw new Error(error.message || "Income lookup failed.");
        const total = (data ?? []).reduce((acc: number, r: any) => acc + Number(r.amount_converted ?? 0), 0);
        return total;
      };

      const sumExpenses = async () => {
        const [{ data: proj, error: e1 }, { data: gen, error: e2 }] = await Promise.all([
          supabase
            .from("expenses")
            .select("amount_converted,date")
            .eq("user_id", userId)
            .gte("date", startIso)
            .lte("date", endIso),
          supabase
            .from("business_expenses")
            .select("amount,date")
            .eq("user_id", userId)
            .gte("date", startIso)
            .lte("date", endIso),
        ]);
        if (e1) throw new Error(e1.message || "Expenses lookup failed.");
        if (e2) throw new Error(e2.message || "Business expenses lookup failed.");
        const a = (proj ?? []).reduce((acc: number, r: any) => acc + Number(r.amount_converted ?? 0), 0);
        const b = (gen ?? []).reduce((acc: number, r: any) => acc + Number(r.amount ?? 0), 0);
        return a + b;
      };

      const sumHours = async (projectId?: string | null) => {
        let q = supabase
          .from("hours")
          .select("hours,start_time,project_id")
          .eq("user_id", userId)
          .gte("start_time", start.toISOString())
          .lt("start_time", endExclusive.toISOString());
        if (projectId) q = q.eq("project_id", projectId);
        const { data, error } = await q;
        if (error) throw new Error(error.message || "Hours lookup failed.");
        const total = (data ?? []).reduce((acc: number, r: any) => acc + Number(r.hours ?? 0), 0);
        return total;
      };

      const byMonthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

      if (aiPayload.action === "get_total_income") {
        const total = await sumIncome();
        queryMessages.push(
          `Total income (${startIso} – ${endIso}): ${fmtMoney(total, baseCurrency)}`
        );
      } else if (aiPayload.action === "get_total_expenses") {
        const total = await sumExpenses();
        queryMessages.push(
          `Total expenses (${startIso} – ${endIso}): ${fmtMoney(total, baseCurrency)}`
        );
      } else if (aiPayload.action === "get_profit") {
        const [inc, exp] = await Promise.all([sumIncome(), sumExpenses()]);
        queryMessages.push(
          `Profit (${startIso} – ${endIso}): ${fmtMoney(inc - exp, baseCurrency)}`
        );
      } else if (aiPayload.action === "get_average_monthly_income") {
        const { data, error } = await supabase
          .from("income")
          .select("amount_converted,date")
          .eq("user_id", userId)
          .gte("date", startIso)
          .lte("date", endIso);
        if (error) throw new Error(error.message || "Income lookup failed.");
        const totals = new Map<string, number>();
        for (const r of data ?? []) {
          const k = byMonthKey(String((r as any).date ?? ""));
          totals.set(k, (totals.get(k) ?? 0) + Number((r as any).amount_converted ?? 0));
        }
        const months = Math.max(1, totals.size);
        const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);
        queryMessages.push(
          `Average monthly income: ${fmtMoney(total / months, baseCurrency)}`
        );
      } else if (aiPayload.action === "get_best_month" || aiPayload.action === "get_worst_month") {
        const wantsHours =
          /\bhours?\b/.test(messageLower) ||
          /\bworked\b/.test(messageLower) ||
          /\bwork\b/.test(messageLower);

        if (wantsHours) {
          const { data, error } = await supabase
            .from("hours")
            .select("hours,start_time")
            .eq("user_id", userId)
            .gte("start_time", start.toISOString())
            .lt("start_time", endExclusive.toISOString());
          if (error) throw new Error(error.message || "Hours lookup failed.");
          const totals = new Map<string, number>();
          for (const r of data ?? []) {
            const st = String((r as any).start_time ?? "");
            const d = st ? new Date(st) : null;
            if (!d || Number.isNaN(d.getTime())) continue;
            const iso = toIsoDateOnly(d);
            const k = byMonthKey(iso);
            totals.set(k, (totals.get(k) ?? 0) + Number((r as any).hours ?? 0));
          }
          const entries = Array.from(totals.entries());
          if (!entries.length) {
            queryMessages.push("No hours found for that period.");
          } else {
            entries.sort((a, b) => a[1] - b[1]);
            const pick =
              aiPayload.action === "get_best_month"
                ? entries[entries.length - 1]
                : entries[0];
            queryMessages.push(
              `${aiPayload.action === "get_best_month" ? "Most" : "Least"} hours month: ${pick[0]} (${pick[1].toFixed(2)}h)`
            );
          }
        } else {
          const { data, error } = await supabase
            .from("income")
            .select("amount_converted,date")
            .eq("user_id", userId)
            .gte("date", startIso)
            .lte("date", endIso);
          if (error) throw new Error(error.message || "Income lookup failed.");
          const totals = new Map<string, number>();
          for (const r of data ?? []) {
            const k = byMonthKey(String((r as any).date ?? ""));
            totals.set(k, (totals.get(k) ?? 0) + Number((r as any).amount_converted ?? 0));
          }
          const entries = Array.from(totals.entries());
          if (!entries.length) {
            queryMessages.push("No income found for that period.");
          } else {
            entries.sort((a, b) => a[1] - b[1]);
            const pick =
              aiPayload.action === "get_best_month"
                ? entries[entries.length - 1]
                : entries[0];
            queryMessages.push(
              `${aiPayload.action === "get_best_month" ? "Best" : "Worst"} month: ${pick[0]} (${fmtMoney(pick[1], baseCurrency)})`
            );
          }
        }
      } else if (aiPayload.action === "compare_periods") {
        // Best guess: compare this_month vs last_month, unless year explicitly provided.
        const aRange = resolveQueryRange({ period: params.period ?? "this_month" });
        const bRange = resolveQueryRange({ period: params.period === "last_month" ? "this_month" : "last_month" });
        const aStart = toIsoDateOnly(aRange.start);
        const aEnd = toIsoDateOnly(new Date(aRange.endExclusive.getTime() - 24 * 3600 * 1000));
        const bStart = toIsoDateOnly(bRange.start);
        const bEnd = toIsoDateOnly(new Date(bRange.endExclusive.getTime() - 24 * 3600 * 1000));
        const sumIncomeIn = async (s: string, e: string) => {
          const { data, error } = await supabase
            .from("income")
            .select("amount_converted,date")
            .eq("user_id", userId)
            .gte("date", s)
            .lte("date", e);
          if (error) throw new Error(error.message || "Income lookup failed.");
          return (data ?? []).reduce((acc: number, r: any) => acc + Number(r.amount_converted ?? 0), 0);
        };
        const [aInc, bInc] = await Promise.all([sumIncomeIn(aStart, aEnd), sumIncomeIn(bStart, bEnd)]);
        queryMessages.push(
          `Income comparison: ${aStart}–${aEnd} ${fmtMoney(aInc, baseCurrency)} vs ${bStart}–${bEnd} ${fmtMoney(bInc, baseCurrency)}`
        );
      } else if (aiPayload.action === "get_top_projects" || aiPayload.action === "get_best_project") {
        const limit = Math.max(1, Math.min(20, Number(params.limit ?? (aiPayload.action === "get_best_project" ? 1 : 5))));
        const { data: projects, error: projErr } = await supabase
          .from("projects")
          .select("id,name")
          .eq("user_id", userId)
          .limit(500);
        if (projErr) throw new Error(projErr.message || "Projects lookup failed.");
        const { data: incomeRows, error: incErr } = await supabase
          .from("income")
          .select("amount_converted,date,project_id")
          .eq("user_id", userId)
          .gte("date", startIso)
          .lte("date", endIso);
        if (incErr) throw new Error(incErr.message || "Income lookup failed.");
        const byProject = new Map<string, number>();
        for (const r of incomeRows ?? []) {
          const pid = String((r as any).project_id ?? "");
          if (!pid) continue;
          byProject.set(pid, (byProject.get(pid) ?? 0) + Number((r as any).amount_converted ?? 0));
        }
        const nameById = new Map((projects ?? []).map((p: any) => [p.id, p.name]));
        const ranked = Array.from(byProject.entries())
          .map(([id, total]) => ({ id, name: nameById.get(id) ?? id, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, limit);
        if (!ranked.length) {
          queryMessages.push("No project income found for that period.");
        } else if (aiPayload.action === "get_best_project") {
          queryMessages.push(
            `Best project: ${ranked[0].name} (${fmtMoney(ranked[0].total, baseCurrency)})`
          );
        } else {
          queryMessages.push(
            `Top projects:\n${ranked.map((r, i) => `${i + 1}. ${r.name} — ${fmtMoney(r.total, baseCurrency)}`).join("\n")}`
          );
        }
      } else if (aiPayload.action === "get_project_revenue") {
        const search = String(params.project_name ?? "").trim();
        if (!search) throw new Error("project_name is required");
        const { data: projects, error: projErr } = await supabase
          .from("projects")
          .select("id,name")
          .eq("user_id", userId)
          .ilike("name", `%${search}%`)
          .limit(10);
        if (projErr) throw new Error(projErr.message || "Projects lookup failed.");
        if (!projects?.length) throw new Error("Project not found");
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
        queryMessages.push(
          `Project revenue (${projects[0].name}): ${fmtMoney(total, baseCurrency)}`
        );
      } else if (aiPayload.action === "get_total_hours") {
        const total = await sumHours();
        queryMessages.push(
          `Total hours (${startIso} – ${endIso}): ${total.toFixed(2)}h`
        );
      } else if (aiPayload.action === "get_project_hours") {
        const search = String(params.project_name ?? "").trim();
        if (!search) throw new Error("project_name is required");
        const { data: projects, error: projErr } = await supabase
          .from("projects")
          .select("id,name")
          .eq("user_id", userId)
          .ilike("name", `%${search}%`)
          .limit(10);
        if (projErr) throw new Error(projErr.message || "Projects lookup failed.");
        if (!projects?.length) throw new Error("Project not found");
        const pid = String((projects[0] as any).id);
        const total = await sumHours(pid);
        queryMessages.push(
          `Project hours (${projects[0].name}): ${total.toFixed(2)}h`
        );
      }
    } else {
      if (!("company_name" in aiPayload)) {
        throw new Error("Company name missing in response");
      }
      
      const rawCompanyName = aiPayload.company_name.trim();
      if (!rawCompanyName) throw new Error("Company name is required");
      const companyName =
        rawCompanyName.charAt(0).toUpperCase() + rawCompanyName.slice(1);

      const { data: existingCompanies, error: duplicateErr } = await supabase
        .from("companies")
        .select("id,name")
        .eq("user_id", userId)
        .ilike("name", companyName)
        .limit(1);
      if (duplicateErr) {
        throw new Error(duplicateErr.message || "Company lookup failed.");
      }
      if ((existingCompanies ?? []).length > 0) {
        throw new Error("Company already exists");
      }

      const { error: insertCompanyErr } = await supabase.from("companies").insert({
        user_id: userId,
        name: companyName,
      });
      if (insertCompanyErr) {
        throw new Error(insertCompanyErr.message || "Company insert failed.");
      }
      actionMessages.push(`Company ${companyName} created`);
    }
    };

    for (const action of actionsToRun) {
      try {
        await runAction(action);
      } catch (err) {
        actionErrors.push(err instanceof Error ? err.message : "Action failed");
      }
    }

    const usagePayload = ((aiEnvelope as any)?.usage_meta ?? (aiEnvelope as any)?.usage) as UsageInfo | undefined;
    if (usagePayload) setUsage(usagePayload);

    if (actionMessages.length) {
      setSuccess(actionMessages.join(" and "));
      setLastSentAt(Date.now());
      setInput("");
      if (!actionErrors.length && queryMessages.length === 0) setOpen(false);
    }

    if (queryMessages.length) {
      setInlineAnswer(queryMessages.join("\n"));
      setLastSentAt(Date.now());
      setInput("");
    }

    if (actionErrors.length) {
      throw new Error(`Some actions failed:\n- ${actionErrors.join("\n- ")}`);
    }
  }

  function validateMessage(messageRaw: string): string | null {
    const message = messageRaw.trim();
    if (!message) {
      setError("Please enter a request.");
      return null;
    }
    const words = countWords(message);
    if (words > MAX_WORDS) {
      setError(`Keep your command short and simple (max ${MAX_WORDS} words)`);
      return null;
    }
    const msSinceLast = Date.now() - lastSentAt;
    if (msSinceLast < LOCAL_COOLDOWN_MS) {
      const waitFor = Math.ceil((LOCAL_COOLDOWN_MS - msSinceLast) / 1000);
      setError(`Please wait ${waitFor}s before sending another request.`);
      return null;
    }

    setError(null);
    setSuccess(null);
    setInlineAnswer(null);
    return message;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[210]">
      <div className="pointer-events-auto absolute bottom-5 right-5">
        <button
          type="button"
          onClick={openModal}
          className="rounded-full border border-indigo-700/70 bg-indigo-950/90 px-3 py-2 text-xs font-medium text-indigo-200 shadow-lg backdrop-blur transition-colors hover:border-indigo-600 hover:bg-indigo-900/90 hover:text-white"
        >
          Ask AI
        </button>
      </div>

      {success ? (
        <div className="pointer-events-none fixed bottom-24 right-5 z-[212]">
          <div className="rounded-lg border border-emerald-800/70 bg-emerald-950/90 px-3 py-2 text-sm text-emerald-200 shadow-lg">
            {success}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="pointer-events-auto fixed inset-0 z-[211] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 z-0 bg-black/75"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-create-client-title"
            className="relative z-10 isolate w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!canUseAi ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2
                    id="ai-create-client-title"
                    className="min-w-0 flex-1 text-base font-semibold text-zinc-100"
                  >
                    AI assistant
                  </h2>
                  <AiAssistantAskHint />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  The AI assistant is not included in the Free plan. Upgrade to{" "}
                  <span className="text-zinc-100">Basic</span> or{" "}
                  <span className="text-zinc-100">Pro</span> to ask natural-language questions and
                  automate clients, income, and projects.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-5 w-full rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2
                    id="ai-create-client-title"
                    className="min-w-0 flex-1 text-base font-semibold text-zinc-100"
                  >
                    AI assistant
                  </h2>
                  <AiAssistantAskHint />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Supported: Clients, income, projects, company, hours — and mileage (Business plans) with natural language or your saved mileage templates
                </p>
                <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
                  {usageLoading && !usage ? (
                    <p className="text-xs text-zinc-500">Loading usage…</p>
                  ) : !usage ? (
                    <p className="text-xs text-zinc-500">
                      Couldn&apos;t load usage. Close and open again to retry.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-400">
                        Used {usage.daily_used ?? usage.usedToday ?? 0}/
                        {usage.daily_limit ?? usage.maxPerDay ?? 50} today
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full bg-indigo-500 transition-[width] duration-150 ease-out"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (((usage.daily_used ?? usage.usedToday ?? 0) /
                                  (usage.daily_limit ?? usage.maxPerDay ?? 50)) *
                                  100),
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <AiInput
                  ref={inputRef}
                  pending={pending || isRunning}
                  maxWords={MAX_WORDS}
                  onSubmit={(message) => {
                    if (isRunning) return;
                    const validated = validateMessage(message);
                    if (!validated) return;
                    setIsRunning(true);
                    startTransition(() => {
                      void handleCreateClientFlow(validated)
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : "Something went wrong.");
                        })
                        .finally(() => {
                          setIsRunning(false);
                        });
                    });
                  }}
                  actions={
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isRunning}
                      className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
                    >
                      Close
                    </button>
                  }
                >
                  <p className="text-xs text-zinc-500">
                    {"Use simple commands like: 'add client {name}'"}
                  </p>
                  {inlineAnswer ? (
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-sm text-zinc-100">
                      <p className="mb-1 text-xs font-medium text-zinc-400">Answer</p>
                      <p className="whitespace-pre-line text-sm text-zinc-100">
                        {inlineAnswer}
                      </p>
                    </div>
                  ) : null}
                  {error ? (
                    <p className="whitespace-pre-line text-sm text-rose-400">{error}</p>
                  ) : null}
                </AiInput>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

