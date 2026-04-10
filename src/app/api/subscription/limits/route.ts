import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { fetchSubscriptionLimitsPayload } from "@/lib/subscription/limits-data";

/**
 * Client-side helpers (e.g. AI assistant) use this to enforce the same project limits as server actions.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const result = await fetchSubscriptionLimitsPayload(supabase, user.id, plan);

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.error === "projects"
            ? "Could not count projects."
            : "Could not count clients.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data);
}
