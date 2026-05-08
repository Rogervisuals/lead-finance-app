"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { canUseActiveTimer } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";

function toNullableString(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Invalidate caches after timer start/stop.
 * Use `page` (not `layout`) for the current route so we avoid revalidating the entire
 * app layout tree on every stop — that was very slow on heavy pages. `/hours` is
 * invalidated explicitly because stopping writes a hours row. `router.refresh()` on
 * the client still refetches the shell for the active URL.
 */
function revalidateAfterTimerChange(returnTo: string) {
  const raw = (returnTo || "/dashboard").trim() || "/dashboard";
  let pathname = "/dashboard";
  try {
    pathname = raw.startsWith("http")
      ? new URL(raw).pathname || "/dashboard"
      : new URL(raw, "http://local.invalid").pathname || "/dashboard";
  } catch {
    pathname = raw.split("?")[0]?.trim() || "/dashboard";
  }
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  revalidatePath(pathname, "page");
  revalidatePath("/hours", "page");
}

async function validateClientAndProject(
  supabase: ReturnType<typeof createSupabaseServerActionClient>,
  userId: string,
  client_id: string,
  project_id: string | null
) {
  if (!project_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("user_id", userId)
      .maybeSingle();
    return !!client;
  }

  const [{ data: client }, { data: project }] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id,client_id")
      .eq("id", project_id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return !!(client && project && project.client_id === client_id);
}

export async function startActiveTimerAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);

  const returnToEarly = String(formData.get("return_to") ?? "/dashboard").trim() || "/dashboard";
  if (!canUseActiveTimer(plan)) {
    redirect(`${returnToEarly}?timer_error=plan_upgrade`);
  }

  const client_id = String(formData.get("client_id") ?? "").trim();
  const projectRaw = String(formData.get("project_id") ?? "").trim();
  const project_id = projectRaw || null;
  const notes = toNullableString(formData.get("notes"));

  const returnToRaw = String(formData.get("return_to") ?? "/dashboard").trim();
  const returnTo = returnToRaw || "/dashboard";

  if (!client_id) redirect(`${returnTo}?timer_error=missing_client`);

  const ok = await validateClientAndProject(supabase, user.id, client_id, project_id);
  if (!ok) redirect(`${returnTo}?timer_error=invalid_project`);

  const { error } = await supabase.from("active_timer").insert({
    user_id: user.id,
    client_id,
    project_id,
    start_time: new Date().toISOString(),
    notes,
  });

  if (error) {
    const msg = String((error as any)?.message ?? "");
    // If DB enforces one active timer per user, treat duplicates as "already running".
    if (/duplicate|unique|already exists/i.test(msg)) {
      redirect(`${returnTo}?timer_error=already_running`);
    }
    redirect(`${returnTo}?timer_error=save_failed`);
  }

  revalidateAfterTimerChange(returnTo);
}

export type StopActiveTimerResult =
  | { ok: true }
  | { ok: false; reason: "no_timer" | "zero_duration" | "save_failed" };

/**
 * Stops the active timer and inserts a hours row when duration is long enough.
 * Returns a result object (no `redirect` on failure) so the client can show the
 * correct message; still `redirect("/login")` when not authenticated.
 */
export async function stopActiveTimerAction(
  formData: FormData
): Promise<StopActiveTimerResult> {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const returnToRaw = String(formData.get("return_to") ?? "/dashboard").trim();
  const returnTo = returnToRaw || "/dashboard";

  const { data: row } = await supabase
    .from("active_timer")
    .select("id,client_id,project_id,start_time,notes")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    return { ok: false, reason: "no_timer" };
  }

  const end = new Date();
  const start = new Date(row.start_time);
  const diffMs = end.getTime() - start.getTime();
  const hours = roundTo2(diffMs / (1000 * 60 * 60));

  if (hours <= 0) {
    await supabase.from("active_timer").delete().eq("id", row.id).eq("user_id", user.id);
    revalidateAfterTimerChange(returnTo);
    return { ok: false, reason: "zero_duration" };
  }

  const { error: hoursErr } = await supabase.from("hours").insert({
    user_id: user.id,
    client_id: row.client_id,
    project_id: row.project_id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    hours,
    notes: row.notes ?? null,
  });

  if (hoursErr) {
    return { ok: false, reason: "save_failed" };
  }

  await supabase.from("active_timer").delete().eq("id", row.id).eq("user_id", user.id);

  revalidateAfterTimerChange(returnTo);
  return { ok: true };
}
