import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canCreateClient,
  canCreateProject,
  getAiDailyCap,
  hasAccess,
} from "@/lib/permissions";
import type { PlanId } from "@/lib/subscription/types";

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type SubscriptionLimitsPayload = {
  plan: PlanId;
  projectCount: number;
  maxProjects: number | null;
  canCreateProject: boolean;
  clientCount: number;
  maxClients: number | null;
  canCreateClient: boolean;
  /** Today's AI request count (0 if plan has no AI or row missing). */
  aiUsedToday: number;
  /** Daily AI cap: 0 = not available, finite number, or unlimited (Infinity). */
  aiDailyCap: number;
  businessFeatures: boolean;
  rateInsights: boolean;
  invoiceFeatures: boolean;
  activeTimer: boolean;
};

export async function fetchSubscriptionLimitsPayload(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanId
): Promise<
  | { ok: true; data: SubscriptionLimitsPayload }
  | { ok: false; error: "projects" | "clients" }
> {
  const usageDate = todayIsoDate();
  const [projectsRes, clientsRes, aiUsageRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_ai_usage")
      .select("requests_count")
      .eq("user_id", userId)
      .eq("date", usageDate)
      .maybeSingle(),
  ]);

  if (projectsRes.error) {
    return { ok: false, error: "projects" };
  }
  if (clientsRes.error) {
    return { ok: false, error: "clients" };
  }

  const projectCount = projectsRes.count ?? 0;
  const clientCount = clientsRes.count ?? 0;
  const maxProjects = hasAccess(plan, "maxProjects");
  const maxClients = hasAccess(plan, "maxClients");

  const aiDailyCap = getAiDailyCap(plan);
  let aiUsedToday = 0;
  if (!aiUsageRes.error && aiDailyCap > 0) {
    aiUsedToday = Number(
      (aiUsageRes.data as { requests_count?: unknown } | null)?.requests_count ?? 0
    );
  }

  return {
    ok: true,
    data: {
      plan,
      projectCount,
      maxProjects: typeof maxProjects === "number" ? maxProjects : null,
      canCreateProject: canCreateProject(plan, projectCount),
      clientCount,
      maxClients: typeof maxClients === "number" ? maxClients : null,
      canCreateClient: canCreateClient(plan, clientCount),
      aiUsedToday,
      aiDailyCap,
      businessFeatures: hasAccess(plan, "businessFeatures") === true,
      rateInsights: hasAccess(plan, "rateInsights") === true,
      invoiceFeatures: hasAccess(plan, "invoiceFeatures") === true,
      activeTimer: hasAccess(plan, "activeTimer") === true,
    },
  };
}
