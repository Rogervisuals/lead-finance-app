"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

export async function createCompanyAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/companies?error=missing_name");

  await supabase.from("companies").insert({
    user_id: user.id,
    name,
  });

  redirect("/companies");
}

export async function deleteCompanyAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/companies");

  await supabase.from("companies").delete().eq("id", id).eq("user_id", user.id);

  redirect("/companies");
}
