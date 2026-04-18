"use server";

import { createSupabaseServerActionClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

const CONFIRM_PHRASE = "DELETE";

export type DeleteAccountState =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteAccountAction(
  _prev: DeleteAccountState | undefined,
  formData: FormData,
): Promise<DeleteAccountState> {
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== CONFIRM_PHRASE) {
    return { ok: false, error: "CONFIRM_MISMATCH" };
  }

  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "NOT_SIGNED_IN" };
  }

  let service: ReturnType<typeof createSupabaseServiceRoleClient>;
  try {
    service = createSupabaseServiceRoleClient();
  } catch {
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const userId = user.id;

  const { data: settingsRow } = await service
    .from("user_settings")
    .select("invoice_logo_path")
    .eq("user_id", userId)
    .maybeSingle();
  const logoPath = String(
    (settingsRow as { invoice_logo_path?: string | null } | null)?.invoice_logo_path ?? "",
  ).trim();
  if (logoPath) {
    await service.storage.from("invoice-logos").remove([logoPath]).catch(() => {});
  }

  const { data: subRow } = await service
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  const stripeCustomerId = String(
    (subRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? "",
  ).trim();
  if (stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      await stripe.customers.del(stripeCustomerId);
    } catch {
      /* best-effort; continue with account removal */
    }
  }

  const { data: clientRows } = await service.from("clients").select("id").eq("user_id", userId);
  const clientIds = (clientRows ?? []).map((r: { id: string }) => r.id);
  const { data: projectRows } = await service.from("projects").select("id").eq("user_id", userId);
  const projectIds = (projectRows ?? []).map((r: { id: string }) => r.id);

  const invoiceIds = new Set<string>();
  if (clientIds.length) {
    const { data: invByClient } = await service.from("invoices").select("id").in("client_id", clientIds);
    (invByClient ?? []).forEach((r: { id: string }) => invoiceIds.add(r.id));
  }
  if (projectIds.length) {
    const { data: invByProject } = await service.from("invoices").select("id").in("project_id", projectIds);
    (invByProject ?? []).forEach((r: { id: string }) => invoiceIds.add(r.id));
  }

  const ids = Array.from(invoiceIds);
  if (ids.length) {
    const { error: clearIncomeErr } = await service
      .from("income")
      .update({ invoice_id: null })
      .in("invoice_id", ids);
    if (clearIncomeErr) {
      console.error("delete account: clear income invoice_id", clearIncomeErr);
      return { ok: false, error: "INVOICE_CLEANUP" };
    }
    const { error: invDelErr } = await service.from("invoices").delete().in("id", ids);
    if (invDelErr) {
      console.error("delete account: delete invoices", invDelErr);
      return { ok: false, error: "INVOICE_CLEANUP" };
    }
  }

  const { error: delUserErr } = await service.auth.admin.deleteUser(userId);
  if (delUserErr) {
    console.error("delete account: auth.admin.deleteUser", delUserErr);
    return { ok: false, error: "DELETE_FAILED" };
  }

  return { ok: true };
}
