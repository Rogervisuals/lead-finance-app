"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AiCreateResponse = {
  action: "create_client";
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiCreateClientsResponse = {
  action: "create_clients";
  clients: Array<{
    name: string;
    email: string | null;
    notes: string | null;
  }>;
  company_name: string | null;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiUpdateResponse = {
  action: "update_client";
  search_name: string;
  new_name: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiAddIncomeResponse = {
  action: "add_income";
  client_name: string;
  project_name: string | null;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiDeleteIncomeResponse = {
  action: "delete_income";
  client_name: string;
  project_name: string | null;
  date: string;
  amount: number | null;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiDeleteClientResponse = {
  action: "delete_client";
  client_name: string;
  force: boolean;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiCreateCompanyResponse = {
  action: "create_company";
  company_name: string;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiCreateProjectResponse = {
  action: "create_project";
  client_name: string;
  project_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiUpdateProjectStatusResponse = {
  action: "update_project_status";
  client_name: string;
  project_name: string;
  status: string;
  end_date: string;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiDeleteProjectResponse = {
  action: "delete_project";
  client_name: string;
  project_name: string;
  usage?: {
    usedToday: number;
    maxPerDay: number;
    remaining: number;
  };
};

type AiResponse =
  | AiCreateResponse
  | AiCreateClientsResponse
  | AiCreateProjectResponse
  | AiUpdateProjectStatusResponse
  | AiDeleteProjectResponse
  | AiUpdateResponse
  | AiAddIncomeResponse
  | AiDeleteIncomeResponse
  | AiDeleteClientResponse
  | AiCreateCompanyResponse;

type UsageInfo = {
  usedToday: number;
  maxPerDay: number;
  remaining: number;
};

const MAX_WORDS = 40;
const LOCAL_COOLDOWN_MS = 3000;

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return toISO(today);
}

function currencySymbol(currency: string) {
  const c = currency.trim().toUpperCase();
  if (c === "USD") return "$";
  if (c === "GBP") return "£";
  return "€";
}

function normalizeSearchText(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
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

export function AiCreateClientAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 2600);
    return () => window.clearTimeout(id);
  }, [success]);

  useEffect(() => {
    if (!open) return;
    void refreshUsage();
  }, [open]);

  function closeModal() {
    setOpen(false);
    setError(null);
  }

  async function refreshUsage() {
    const res = await fetch("/api/ai-create-client", { method: "GET" });
    if (!res.ok) return;
    const payload = (await res.json().catch(() => null)) as UsageInfo | null;
    if (!payload) return;
    if (
      typeof payload.usedToday === "number" &&
      typeof payload.maxPerDay === "number" &&
      typeof payload.remaining === "number"
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

    const actionsRaw = Array.isArray((aiEnvelope as { actions?: unknown }).actions)
      ? ((aiEnvelope as { actions?: unknown[] }).actions ?? [])
      : [aiEnvelope];
    const actionsToRun = actionsRaw.filter(isAiResponse) as AiResponse[];
    if (!actionsToRun.length) {
      throw new Error("AI response invalid.");
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in.");
    const userId = user.id;
    const messageLower = message.toLowerCase();

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
    const actionErrors: string[] = [];

    const runAction = async (aiPayload: AiResponse) => {
      if (aiPayload.action === "create_client") {
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
    } else {
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

    const usagePayload = (aiEnvelope as { usage?: unknown }).usage as
      | { usedToday?: unknown; maxPerDay?: unknown; remaining?: unknown }
      | undefined;
    if (
      usagePayload &&
      typeof usagePayload.usedToday === "number" &&
      typeof usagePayload.maxPerDay === "number" &&
      typeof usagePayload.remaining === "number"
    ) {
      setUsage({
        usedToday: usagePayload.usedToday,
        maxPerDay: usagePayload.maxPerDay,
        remaining: usagePayload.remaining,
      });
    }

    if (actionMessages.length) {
      setSuccess(actionMessages.join(" and "));
      setLastSentAt(Date.now());
      setInput("");
      if (!actionErrors.length) setOpen(false);
    }

    if (actionErrors.length) {
      throw new Error(`Some actions failed:\n- ${actionErrors.join("\n- ")}`);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = input.trim();
    if (!message) {
      setError("Please enter a request.");
      return;
    }
    const words = countWords(message);
    if (words > MAX_WORDS) {
      setError("Keep your command short and simple (max 40 words)");
      return;
    }
    const msSinceLast = Date.now() - lastSentAt;
    if (msSinceLast < LOCAL_COOLDOWN_MS) {
      const waitFor = Math.ceil((LOCAL_COOLDOWN_MS - msSinceLast) / 1000);
      setError(`Please wait ${waitFor}s before sending another request.`);
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await handleCreateClientFlow(message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const wordsNow = countWords(input);
  const tooLong = wordsNow > MAX_WORDS;

  return (
    <div className="pointer-events-none fixed inset-0 z-[210]">
      <div className="pointer-events-auto absolute bottom-20 right-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-indigo-700/70 bg-indigo-950/90 px-3 py-2 text-xs font-medium text-indigo-200 shadow-lg backdrop-blur transition-colors hover:border-indigo-600 hover:bg-indigo-900/90 hover:text-white"
        >
          Ask AI
        </button>
      </div>

      {success ? (
        <div className="pointer-events-none fixed bottom-36 right-5 z-[212]">
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
            className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-create-client-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="ai-create-client-title"
              className="text-base font-semibold text-zinc-100"
            >
              AI assistant
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Supported: Create/update/Delete clients, Add/delete income, Create company, Create/update/delete projects
            </p>
            <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
              <p className="text-xs text-zinc-400">
                Used {usage?.usedToday ?? 0}/{usage?.maxPerDay ?? 20} today
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (((usage?.usedToday ?? 0) / (usage?.maxPerDay ?? 20)) * 100),
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-3 space-y-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
                rows={4}
                placeholder="Type a command..."
                disabled={pending}
                className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500 disabled:opacity-60"
              />
              <p className="text-xs text-zinc-500">
                {"Use simple commands like: 'add client {name}'"}
              </p>
              <p className="text-xs text-zinc-500">
                {wordsNow}/{MAX_WORDS} words
              </p>
              {error ? (
                <p className="whitespace-pre-line text-sm text-rose-400">{error}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={pending || tooLong}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {pending ? "Processing..." : "Run"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

