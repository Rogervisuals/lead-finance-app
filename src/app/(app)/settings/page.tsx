import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateUserSettingsForSettingsPage } from "@/lib/user-settings";
import { BusinessLogoUpload } from "@/components/settings/BusinessLogoUpload";
import { SettingsSaveButton } from "@/components/settings/SettingsSaveButton";
import { SettingsAccordionSection } from "@/components/settings/SettingsAccordionSection";
import { getInvoiceLogoPublicUrl } from "@/lib/supabase/invoice-logo";
import { INCOME_CURRENCY_OPTIONS } from "@/lib/finance/income-currency";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { saveUnifiedSettingsAction } from "../server-actions/user-business-settings";
import { canUseInvoiceFeatures } from "@/lib/permissions";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";

const FORM_ID = "settings-main-form";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";
const labelClass = "block text-sm font-medium text-zinc-200";
const hintClass = "mt-1.5 text-xs leading-relaxed text-zinc-500";

function ToggleSwitch({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="h-7 w-14 rounded-full border border-zinc-800 bg-zinc-900/30 transition-all duration-300 peer-checked:bg-zinc-100" />
      <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-zinc-100 shadow transition-all duration-300 peer-checked:translate-x-7 peer-checked:bg-zinc-950" />
    </label>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: {
    saved?: string;
    error?: string;
  };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  const invoiceFeatures = canUseInvoiceFeatures(plan);

  const ui = getUi(getServerLocale());
  const { financialSettings, row } = await getOrCreateUserSettingsForSettingsPage(
    user.id
  );

  const saved = searchParams?.saved === "1";
  const missingBusinessName = searchParams?.error === "business_name";
  const fxRateError = searchParams?.error === "fx_rate";
  const logoErr = searchParams?.error;
  const logoErrorMessage =
    logoErr === "logo_file"
      ? ui.errors.settingsLogoFile
      : logoErr === "logo_size"
        ? ui.errors.settingsLogoSize
        : logoErr === "logo_type"
          ? ui.errors.settingsLogoType
          : logoErr === "logo_upload"
            ? ui.errors.settingsLogoUpload
            : null;

  const invoiceLogoUrl = getInvoiceLogoPublicUrl(row.invoice_logo_path);

  const allowedSet = new Set(INCOME_CURRENCY_OPTIONS as readonly string[]);
  const baseSelect = allowedSet.has(financialSettings.base_currency)
    ? financialSettings.base_currency
    : "EUR";
  const comparisonSelect = allowedSet.has(financialSettings.comparison_currency)
    ? financialSettings.comparison_currency
    : "USD";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">{ui.settings.title}</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
            {ui.settings.subtitle}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-lg border border-zinc-800/90 bg-zinc-950/50 px-3.5 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
        >
          {ui.common.back}
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {saved ? (
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200/95">
            {ui.settings.saved}
          </div>
        ) : null}
        {missingBusinessName ? (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/95">
            {ui.settings.businessNameRequired}
          </div>
        ) : null}
        {logoErrorMessage ? (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/95">
            {logoErrorMessage}
          </div>
        ) : null}
        {fxRateError ? (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/95">
            {ui.settings.fxRateError}
          </div>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/20 shadow-sm">
        <form id={FORM_ID} action={saveUnifiedSettingsAction}>
          <input type="hidden" name="return_to" value="/settings" />

          <SettingsAccordionSection title={ui.settings.financialTitle} defaultOpen>
            <p className="text-sm text-zinc-500">{ui.settings.financialSubtitle}</p>

            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
              <div className="min-w-0 flex-1">
                <div className={labelClass}>{ui.settings.enableVat}</div>
                <p className={`${hintClass} max-w-md`}>{ui.settings.enableVatHint}</p>
              </div>
              <div className="shrink-0">
                <input type="hidden" name="vat_enabled" value="false" />
                <ToggleSwitch name="vat_enabled" defaultChecked={financialSettings.vat_enabled} />
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-8">
              <label className="block">
                <span className={labelClass}>{ui.settings.vatPercent}</span>
                <div className="relative mt-2">
                  <input
                    name="vat_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="21"
                    defaultValue={financialSettings.vat_percentage}
                    className={`${inputClass} pr-9`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    %
                  </span>
                </div>
                <span className={hintClass}>{ui.settings.vatPercentHint}</span>
              </label>

              <label className="block">
                <span className={labelClass}>{ui.settings.taxPercent}</span>
                <div className="relative mt-2">
                  <input
                    name="tax_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="30"
                    defaultValue={financialSettings.tax_percentage}
                    className={`${inputClass} pr-9`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    %
                  </span>
                </div>
                <span className={hintClass}>{ui.settings.taxPercentHint}</span>
              </label>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-8">
              <label className="block">
                <span className={labelClass}>{ui.settings.baseCurrency}</span>
                <select
                  name="base_currency"
                  defaultValue={baseSelect}
                  className={`${inputClass} mt-2`}
                >
                  {INCOME_CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className={hintClass}>{ui.settings.baseCurrencyHint}</span>
              </label>

              <label className="block">
                <span className={labelClass}>{ui.settings.comparisonCurrency}</span>
                <select
                  name="comparison_currency"
                  defaultValue={comparisonSelect}
                  className={`${inputClass} mt-2`}
                >
                  {INCOME_CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className={hintClass}>{ui.settings.comparisonCurrencyHint}</span>
              </label>
            </div>
          </SettingsAccordionSection>
        </form>

        <SettingsAccordionSection title={ui.settings.invoiceTitle}>
          <p className="text-sm text-zinc-500">{ui.settings.invoiceSectionLead}</p>
          <p className="mt-2 text-sm text-zinc-500">{ui.settings.invoiceSubtitle}</p>

          {invoiceFeatures ? (
            <div className="mt-6">
              <BusinessLogoUpload initialLogoUrl={invoiceLogoUrl} returnTo="/settings" />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">
              {ui.settings.invoiceProTeaser}{" "}
              <Link
                href="/settings/billing"
                className="font-medium text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
              >
                {ui.settings.invoiceProTeaserLink}
              </Link>
              .
            </p>
          )}

          <h3 className="mt-10 text-sm font-semibold text-zinc-200">
            {ui.settings.businessInfoTitle}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">{ui.settings.businessInfoSubtitle}</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6">
            <label className="block sm:col-span-1">
              <span className={labelClass}>
                {ui.settings.businessName} <span className="text-rose-400/90">*</span>
              </span>
              <input
                form={FORM_ID}
                name="business_name"
                required
                defaultValue={row.business_name ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-1">
              <span className={labelClass}>{ui.common.email}</span>
              <input
                form={FORM_ID}
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={row.email ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-1">
              <span className={labelClass}>{ui.settings.fullName}</span>
              <input
                form={FORM_ID}
                name="full_name"
                autoComplete="name"
                defaultValue={row.full_name ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-1">
              <span className={labelClass}>{ui.settings.phone}</span>
              <input
                form={FORM_ID}
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={row.phone ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-1">
              <span className={labelClass}>{ui.settings.website}</span>
              <input
                form={FORM_ID}
                name="website"
                type="text"
                placeholder="https://"
                defaultValue={row.website ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-1">
              <span className={labelClass}>{ui.settings.iban}</span>
              <input
                form={FORM_ID}
                name="iban"
                defaultValue={row.iban ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-1">
              <span className={labelClass}>{ui.settings.vatNumber}</span>
              <input
                form={FORM_ID}
                name="vat_number"
                defaultValue={row.vat_number ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-1">
              <span className={labelClass}>{ui.settings.kvk}</span>
              <input
                form={FORM_ID}
                name="kvk_number"
                defaultValue={row.kvk_number ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClass}>{ui.settings.address}</span>
              <textarea
                form={FORM_ID}
                name="address"
                rows={3}
                defaultValue={row.address ?? ""}
                className={`${inputClass} mt-2 min-h-[5.5rem] resize-y`}
              />
            </label>
          </div>
        </SettingsAccordionSection>

        <SettingsAccordionSection title={ui.settings.billingSectionTitle}>
          <p className="text-sm leading-relaxed text-zinc-500">
            {ui.settings.billingSectionIntro}
          </p>
          <Link
            href="/settings/billing"
            className="mt-4 inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
          >
            {ui.settings.billingNavCta}
          </Link>
        </SettingsAccordionSection>

        <div className="border-t border-zinc-800/70 bg-zinc-950/50 px-6 py-5 sm:px-10">
          <SettingsSaveButton formId={FORM_ID} />
        </div>
      </div>
    </div>
  );
}
