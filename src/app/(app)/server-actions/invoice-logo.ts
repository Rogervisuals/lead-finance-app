"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { assertInvoiceFeaturesAllowed } from "@/lib/subscription/plan";

const BUCKET = "invoice-logos";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function extForMime(mime: string) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}

export async function uploadInvoiceLogoAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await assertInvoiceFeaturesAllowed(supabase, user.id);

  const returnTo = String(formData.get("return_to") ?? "/settings").trim() || "/settings";
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${returnTo}?error=logo_file`);
  }
  if (file.size > MAX_BYTES) {
    redirect(`${returnTo}?error=logo_size`);
  }
  if (!ALLOWED.has(file.type)) {
    redirect(`${returnTo}?error=logo_type`);
  }

  const ext = extForMime(file.type);
  if (!ext) redirect(`${returnTo}?error=logo_type`);

  await getOrCreateUserFinancialSettings(user.id);

  const { data: row } = await supabase
    .from("user_settings")
    .select("invoice_logo_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const oldPath = String((row as { invoice_logo_path?: string | null })?.invoice_logo_path ?? "").trim() || null;

  const path = `${user.id}/logo-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (upErr) {
    console.error(upErr);
    redirect(`${returnTo}?error=logo_upload`);
  }

  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  await supabase
    .from("user_settings")
    .update({
      invoice_logo_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  redirect(`${returnTo}?saved=1`);
}

export async function removeInvoiceLogoAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await assertInvoiceFeaturesAllowed(supabase, user.id);

  const returnTo = String(formData.get("return_to") ?? "/settings").trim() || "/settings";

  const { data: row } = await supabase
    .from("user_settings")
    .select("invoice_logo_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const oldPath = String((row as { invoice_logo_path?: string | null })?.invoice_logo_path ?? "").trim() || null;

  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  await supabase
    .from("user_settings")
    .update({
      invoice_logo_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  redirect(`${returnTo}?saved=1`);
}
