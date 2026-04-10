"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { convertToBase } from "@/lib/finance/income-currency";
import { fetchFxRateFromProviders } from "@/lib/finance/exchange-rate";
import { getOrCreateUserFinancialSettings } from "@/lib/user-settings";
import { assertInvoiceFeaturesAllowed } from "@/lib/subscription/plan";

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function readBooleanCheckbox(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((v) => String(v).trim())
    .includes("true");
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseInvoiceCurrency(raw: string | null | undefined): "EUR" | "USD" {
  const c = String(raw ?? "EUR").trim().toUpperCase();
  return c === "USD" ? "USD" : "EUR";
}

async function amountToBaseForIncome(
  amount: number,
  invoiceCurrency: "EUR" | "USD",
  baseCurrency: string
) {
  const base = baseCurrency.trim().toUpperCase() || "EUR";
  if (invoiceCurrency === base) {
    return convertToBase(amount, invoiceCurrency, base, 1);
  }
  const rate = await fetchFxRateFromProviders(invoiceCurrency, base);
  if (rate == null) {
    return null;
  }
  return convertToBase(amount, invoiceCurrency, base, rate);
}

export async function createInvoiceAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await assertInvoiceFeaturesAllowed(supabase, user.id);

  const returnTo = String(formData.get("return_to") ?? "/projects").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) redirect(returnTo);

  const unitPriceExVat = toNumber(formData.get("amount_ex_vat"));
  if (!unitPriceExVat || unitPriceExVat <= 0) redirect(returnTo);

  let quantity = toNumber(formData.get("quantity"));
  if (quantity == null || quantity <= 0) quantity = 1;
  quantity = Math.min(1_000_000, quantity);
  quantity = Math.round(quantity * 10000) / 10000;

  const lineExVat = round2(Number(unitPriceExVat) * quantity);

  const settings = await getOrCreateUserFinancialSettings(user.id);

  const { data: project } = await supabase
    .from("projects")
    .select("id,client_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) redirect(returnTo);

  const vatEnabled = readBooleanCheckbox(formData, "vat_enabled");
  const vatPercentageRaw = toNumber(formData.get("vat_percentage"));
  const vatPercentage = Number.isFinite(Number(vatPercentageRaw))
    ? Math.max(0, Math.min(100, Number(vatPercentageRaw)))
    : settings.vat_percentage ?? 21;

  const vatAmount = vatEnabled ? round2(lineExVat * (vatPercentage / 100)) : 0;
  const totalAmount = round2(lineExVat + vatAmount);

  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw.length ? descriptionRaw.slice(0, 4000) : null;
  const currency = parseInvoiceCurrency(String(formData.get("currency") ?? ""));

  const { error: insertError } = await supabase.from("invoices").insert({
    project_id: project.id,
    client_id: project.client_id,
    amount_ex_vat: lineExVat,
    vat_enabled: vatEnabled,
    vat_percentage: round2(vatPercentage),
    vat_amount: vatAmount,
    total_amount: totalAmount,
    status: "open",
    description,
    quantity,
    currency,
  });

  if (insertError) {
    const sep = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${sep}invoice_create_error=1`);
  }

  redirect(returnTo);
}

export async function toggleInvoiceStatusAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await assertInvoiceFeaturesAllowed(supabase, user.id);

  const returnTo = String(formData.get("return_to") ?? "/projects").trim();
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  if (!invoiceId) redirect(returnTo);

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id,project_id,client_id,status,paid_at,amount_ex_vat,vat_enabled,vat_percentage,description,currency"
    )
    .eq("id", invoiceId)
    .single();

  if (!invoice?.project_id) redirect(returnTo);

  const { data: project } = await supabase
    .from("projects")
    .select("id,user_id,client_id")
    .eq("id", invoice.project_id)
    .eq("user_id", user.id)
    .single();

  if (!project) redirect(returnTo);

  const nextStatus = invoice.status === "paid" ? "open" : "paid";
  const shouldInsertIncome = nextStatus === "paid" && !invoice.paid_at;
  const paidAt = nextStatus === "paid" ? new Date().toISOString() : null;

  await supabase
    .from("invoices")
    .update({
      status: nextStatus,
      paid_at: paidAt,
    })
    .eq("id", invoiceId);

  if (shouldInsertIncome) {
    const settings = await getOrCreateUserFinancialSettings(user.id);
    const baseCurrency = settings.base_currency ?? "EUR";
    const customDesc = String(invoice.description ?? "").trim();
    const incomeDescription = customDesc.length
      ? customDesc
      : `Invoice ${invoiceId}`;

    const { data: existingByInvoice } = await supabase
      .from("income")
      .select("id")
      .eq("user_id", user.id)
      .eq("invoice_id", invoiceId)
      .limit(1);

    const { data: existingLegacy } =
      existingByInvoice?.length ?
        { data: null }
      : await supabase
          .from("income")
          .select("id")
          .eq("user_id", user.id)
          .eq("project_id", project.id)
          .eq("description", `Invoice ${invoiceId}`)
          .is("invoice_id", null)
          .limit(1);

    const alreadyRecorded =
      Boolean(existingByInvoice?.length) || Boolean(existingLegacy?.length);

    if (!alreadyRecorded) {
      const amount = round2(Number(invoice.amount_ex_vat ?? 0));
      if (amount > 0) {
        const invCurrency = parseInvoiceCurrency(
          (invoice as { currency?: string | null }).currency
        );
        const converted = await amountToBaseForIncome(
          amount,
          invCurrency,
          baseCurrency
        );
        if (!converted) {
          const sep = returnTo.includes("?") ? "&" : "?";
          redirect(`${returnTo}${sep}invoice_fx_error=1`);
        }
        await supabase.from("income").insert({
          user_id: user.id,
          client_id: project.client_id,
          project_id: project.id,
          date: isoToday(),
          amount_original: amount,
          currency: invCurrency,
          amount_converted: converted.amount_converted,
          exchange_rate: converted.exchange_rate,
          description: incomeDescription,
          invoice_id: invoiceId,
        });
      }
    }
  }

  redirect(returnTo);
}

export async function deleteInvoiceAction(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await assertInvoiceFeaturesAllowed(supabase, user.id);

  const returnTo = String(formData.get("return_to") ?? "/projects").trim();
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  if (!invoiceId) redirect(returnTo);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id,project_id,paid_at")
    .eq("id", invoiceId)
    .single();

  if (!invoice?.project_id) redirect(returnTo);

  const { data: project } = await supabase
    .from("projects")
    .select("id,user_id")
    .eq("id", invoice.project_id)
    .eq("user_id", user.id)
    .single();

  if (!project) redirect(returnTo);

  // Legacy income rows (no invoice_id) keyed by description; new rows cascade when invoice is deleted.
  const legacyDescription = `Invoice ${invoiceId}`;
  await supabase
    .from("income")
    .delete()
    .eq("user_id", user.id)
    .eq("project_id", project.id)
    .is("invoice_id", null)
    .eq("description", legacyDescription);

  await supabase.from("invoices").delete().eq("id", invoiceId);

  redirect(returnTo);
}

