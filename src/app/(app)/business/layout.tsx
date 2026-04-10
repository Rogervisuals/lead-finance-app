import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  getUserOrNull,
} from "@/lib/supabase/server";
import { hasAccess } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";

/**
 * Business routes show the real app when `businessFeatures` is on the plan; otherwise
 * an upgrade message (nav still links here for all plans).
 */
export default async function BusinessSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUserOrNull();
  if (!user) redirect("/login");

  const supabase = createSupabaseServerClient();
  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);

  if (!hasAccess(plan, "businessFeatures")) {
    const ui = getUi(getServerLocale());
    return (
      <div className="mx-auto min-w-0 max-w-2xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-100">{ui.business.title}</h1>
        <div
          className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {ui.planGating.businessBody}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
