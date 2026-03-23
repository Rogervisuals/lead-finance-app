"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

async function requireAdmin() {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminUser(user.email)) {
    return { supabase: null as null, user: null as null };
  }
  return { supabase, user };
}

export async function deleteFeedbackAdminAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { error } = await supabase.from("feedback").delete().eq("id", id);
  if (error) console.error("delete feedback:", error);

  revalidatePath("/feedback");
}

export async function setFeedbackCompletedAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "").trim();
  const completedRaw = String(formData.get("completed") ?? "").trim();
  const completed = completedRaw === "true";

  if (!id) return;

  const { error } = await supabase
    .from("feedback")
    .update({ completed })
    .eq("id", id);

  if (error) console.error("feedback completed:", error);

  revalidatePath("/feedback");
}
