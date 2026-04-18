import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardActivityYearScope = "dashboard" | "business_expenses" | "mileage";

function boundsForCalendarYear(y: number) {
  const dateStart = `${y}-01-01`;
  const dateEndEx = `${y + 1}-01-01`;
  const timeStart = `${dateStart}T00:00:00.000Z`;
  const timeEndEx = `${dateEndEx}T00:00:00.000Z`;
  return { dateStart, dateEndEx, timeStart, timeEndEx };
}

async function yearHasDashboardActivity(
  supabase: SupabaseClient,
  userId: string,
  y: number
): Promise<boolean> {
  const { dateStart, dateEndEx, timeStart, timeEndEx } = boundsForCalendarYear(y);
  const [inc, exp, hrs, bus] = await Promise.all([
    supabase
      .from("income")
      .select("id")
      .eq("user_id", userId)
      .gte("date", dateStart)
      .lt("date", dateEndEx)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("id")
      .eq("user_id", userId)
      .gte("date", dateStart)
      .lt("date", dateEndEx)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hours")
      .select("id")
      .eq("user_id", userId)
      .gte("start_time", timeStart)
      .lt("start_time", timeEndEx)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("business_expenses")
      .select("id")
      .eq("user_id", userId)
      .gte("date", dateStart)
      .lt("date", dateEndEx)
      .limit(1)
      .maybeSingle(),
  ]);
  return !!(inc.data || exp.data || hrs.data || bus.data);
}

async function yearHasBusinessExpenseActivity(
  supabase: SupabaseClient,
  userId: string,
  y: number
): Promise<boolean> {
  const { dateStart, dateEndEx } = boundsForCalendarYear(y);
  const { data } = await supabase
    .from("business_expenses")
    .select("id")
    .eq("user_id", userId)
    .gte("date", dateStart)
    .lt("date", dateEndEx)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function yearHasMileageActivity(
  supabase: SupabaseClient,
  userId: string,
  y: number
): Promise<boolean> {
  const { dateStart, dateEndEx } = boundsForCalendarYear(y);
  const { data } = await supabase
    .from("mileage")
    .select("id")
    .eq("user_id", userId)
    .gte("date", dateStart)
    .lt("date", dateEndEx)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * Calendar years in [minYear, maxYear] where the user has at least one row
 * in the relevant tables (see scope). Used to hide empty years in range dropdowns.
 */
export async function getYearsWithActivityInRange(
  supabase: SupabaseClient,
  userId: string,
  minYear: number,
  maxYear: number,
  scope: DashboardActivityYearScope
): Promise<Set<number>> {
  const checker =
    scope === "dashboard"
      ? yearHasDashboardActivity
      : scope === "mileage"
        ? yearHasMileageActivity
        : yearHasBusinessExpenseActivity;
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);
  const flags = await Promise.all(
    years.map((y) => checker(supabase, userId, y).then((has) => ({ y, has })))
  );
  return new Set(flags.filter((f) => f.has).map((f) => f.y));
}
