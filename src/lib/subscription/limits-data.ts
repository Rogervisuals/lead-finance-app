import type { SupabaseClient } from "@supabase/supabase-js";
import { canCreateClient, canCreateProject, hasAccess } from "@/lib/permissions";
import type { PlanId } from "@/lib/subscription/types";

export type SubscriptionLimitsPayload = {
  plan: PlanId;
  projectCount: number;
  maxProjects: number | null;
  canCreateProject: boolean;
  clientCount: number;
  maxClients: number | null;
  canCreateClient: boolean;
};

export async function fetchSubscriptionLimitsPayload(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanId
): Promise<
  | { ok: true; data: SubscriptionLimitsPayload }
  | { ok: false; error: "projects" | "clients" }
> {
  const [projectsRes, clientsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
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
    },
  };
}
