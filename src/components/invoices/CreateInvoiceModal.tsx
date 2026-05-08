"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { BUILTIN_THANK_YOU_MESSAGE } from "@/lib/invoices/invoice-footer-copy";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseHoursInputToDecimal(raw: string): number | null {
  const s = String(raw ?? "").trim();
  if (!s.length) return null;
  if (s.includes(":")) {
    const [hRaw, mRaw, extra] = s.split(":");
    if (extra != null) return null;
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0) return null;
    if (m < 0 || m >= 60) return null;
    return h + m / 60;
  }
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function formatDecimalHoursAsHm(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0:00";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.abs(totalMinutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

const INVOICE_CURRENCIES = ["EUR", "USD"] as const;
const INVOICE_LANGUAGES = [
  { value: "en", label: "ENG (English)" },
  { value: "es", label: "ESP (Spanish)" },
  { value: "nl", label: "NL (Dutch / Netherlands)" },
] as const;

type InvoiceLocale = (typeof INVOICE_LANGUAGES)[number]["value"];
type QuantityUnit = "qty" | "hours";

export function CreateInvoiceModal({
  clientName,
  projectName,
  projectId,
  vatPercentageDefault,
  vatEnabledDefault,
  defaultInvoiceCurrency,
  defaultThankYouMessage,
  defaultPaymentInformation,
  returnTo,
  createInvoiceAction,
  saveInvoiceFooterDefaultsAction,
}: {
  clientName: string;
  projectName: string;
  projectId: string;
  vatPercentageDefault: number;
  vatEnabledDefault: boolean;
  /** EUR or USD; used as the initial selection when creating an invoice. */
  defaultInvoiceCurrency: "EUR" | "USD";
  /** From user_settings (or built-in thank-you when unset). */
  defaultThankYouMessage: string;
  defaultPaymentInformation: string;
  returnTo: string;
  createInvoiceAction: (formData: FormData) => Promise<
    { ok: true } | { ok: false; message: string }
  >;
  saveInvoiceFooterDefaultsAction: (formData: FormData) => Promise<
    { ok: true } | { ok: false; message: string }
  >;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>("qty");
  const [includeVat, setIncludeVat] = useState(vatEnabledDefault);
  const [currency, setCurrency] = useState<"EUR" | "USD">(defaultInvoiceCurrency);
  const [invoiceLocale, setInvoiceLocale] = useState<InvoiceLocale>("en");
  const [thankYouDraft, setThankYouDraft] = useState(defaultThankYouMessage);
  const [paymentDraft, setPaymentDraft] = useState(defaultPaymentInformation);
  const [defaultsFeedback, setDefaultsFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [defaultsPending, startDefaultsTransition] = useTransition();
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const [createPending, startCreateTransition] = useTransition();
  const [closingAfterCreate, setClosingAfterCreate] = useState(false);

  const amountNum = Number(amount || 0);
  const quantityNum =
    quantityUnit === "hours"
      ? Number(parseHoursInputToDecimal(quantity) ?? 0)
      : Number(quantity || 0);
  const vatPct = vatPercentageDefault ?? 21;

  useEffect(() => {
    if (!open) return;
    setThankYouDraft(defaultThankYouMessage);
    setPaymentDraft(defaultPaymentInformation);
    setDefaultsFeedback(null);
    setCreateFeedback(null);
    setClosingAfterCreate(false);
    setInvoiceLocale("en");
    setQuantityUnit("qty");
  }, [open, defaultThankYouMessage, defaultPaymentInformation]);

  const lineExVat = useMemo(() => {
    if (!Number.isFinite(amountNum) || amountNum <= 0) return 0;
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) return 0;
    return round2(amountNum * quantityNum);
  }, [amountNum, quantityNum]);

  const vatAmount = useMemo(() => {
    if (!includeVat) return 0;
    if (lineExVat <= 0) return 0;
    return round2(lineExVat * (vatPct / 100));
  }, [includeVat, lineExVat, vatPct]);

  const total = useMemo(() => {
    if (lineExVat <= 0) return 0;
    return round2(lineExVat + vatAmount);
  }, [lineExVat, vatAmount]);

  function close() {
    setOpen(false);
  }

  function saveFooterDefaults() {
    setDefaultsFeedback(null);
    startDefaultsTransition(async () => {
      const fd = new FormData();
      fd.set("thank_you_message", thankYouDraft);
      fd.set("payment_information", paymentDraft);
      const res = await saveInvoiceFooterDefaultsAction(fd);
      if (res.ok) {
        setDefaultsFeedback({
          ok: true,
          text: "Saved as your defaults — we'll pre-fill these next time you open Create invoice.",
        });
        router.refresh();
      } else {
        setDefaultsFeedback({ ok: false, text: res.message });
      }
    });
  }

  function submitCreateInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateFeedback(null);
    const fd = new FormData(e.currentTarget);
    startCreateTransition(async () => {
      const res = await createInvoiceAction(fd);
      if (res.ok) {
        // Keep the modal visible for a moment so the refreshed invoice list can paint,
        // otherwise it feels like it closes "too fast" and the row appears later.
        setClosingAfterCreate(true);
        setCreateFeedback("Invoice created. Updating list…");
        router.refresh();
        window.setTimeout(() => {
          setOpen(false);
        }, 650);
        return;
      }
      setCreateFeedback(res.message);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
      >
        Create Invoice
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[130] flex items-end justify-center overflow-y-auto overscroll-y-contain p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:items-center sm:py-8">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-zinc-950/80"
                onClick={close}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-invoice-title"
                className="relative z-10 w-full max-w-md max-h-[min(calc(100dvh-2rem),900px)] min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl shadow-black/50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 id="create-invoice-title" className="text-lg font-semibold text-zinc-100">
                    Create invoice
                  </h3>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-950/60"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={submitCreateInvoice} className="grid gap-3">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="vat_percentage" value={String(vatPct)} />
                  <input type="hidden" name="invoice_locale" value={invoiceLocale} />
                  <input type="hidden" name="quantity_unit" value={quantityUnit} />

                  <div className="rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <div className="text-xs text-zinc-500">Client</div>
                    <div className="text-sm text-zinc-200">{clientName}</div>
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <div className="text-xs text-zinc-500">Project</div>
                    <div className="text-sm text-zinc-200">{projectName}</div>
                  </div>

                  <label className="space-y-1">
                    <span className="text-sm text-zinc-300">Description (optional)</span>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue=""
                      placeholder="Shown on the invoice and as income description when paid"
                      className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 disabled:opacity-60"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-zinc-300">Thank you message</span>
                    <textarea
                      name="thank_you_message"
                      rows={4}
                      value={thankYouDraft}
                      onChange={(e) => setThankYouDraft(e.target.value)}
                      placeholder={BUILTIN_THANK_YOU_MESSAGE}
                      className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 disabled:opacity-60"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-zinc-300">Payment information</span>
                    <textarea
                      name="payment_information"
                      rows={5}
                      value={paymentDraft}
                      onChange={(e) => setPaymentDraft(e.target.value)}
                      placeholder="e.g. *Paypal Email:* you@example.com, *WISE or Bank transfer* — use asterisks around words or phrases you want in bold."
                      className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 disabled:opacity-60"
                    />
                    <p className="text-xs text-zinc-500">
                      Wrap text in asterisks for bold on the PDF, e.g.{" "}
                      <span className="font-mono text-zinc-400">*Paypal Email:*</span>
                    </p>
                  </label>

                  <div className="flex flex-col gap-2 rounded-md border border-zinc-800/80 bg-zinc-950/20 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={saveFooterDefaults}
                      disabled={defaultsPending}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
                    >
                      {defaultsPending ? "Saving…" : "Save thank you & payment as my defaults"}
                    </button>
                    <p className="text-xs text-zinc-500">
                      Next time you open this form, these two fields will start with your saved text.
                      Clearing thank you and saving resets it to the built-in wording.
                    </p>
                    {defaultsFeedback ? (
                      <p
                        className={
                          defaultsFeedback.ok
                            ? "text-xs text-emerald-400/90"
                            : "text-xs text-amber-200/90"
                        }
                        role="status"
                      >
                        {defaultsFeedback.text}
                      </p>
                    ) : null}
                  </div>

                  <label className="space-y-1">
                    <span className="text-sm text-zinc-300">Invoice currency</span>
                    <select
                      name="currency"
                      value={currency}
                      onChange={(e) =>
                        setCurrency(e.target.value === "USD" ? "USD" : "EUR")
                      }
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
                    >
                      {INVOICE_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c === "EUR" ? "Euro (EUR)" : "US dollar (USD)"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-zinc-300">Invoice language</span>
                    <select
                      value={invoiceLocale}
                      onChange={(e) => {
                        const v = e.target.value;
                        setInvoiceLocale(v === "es" ? "es" : v === "nl" ? "nl" : "en");
                      }}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
                    >
                      {INVOICE_LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <span className="text-sm text-zinc-200">
                      {invoiceLocale === "es"
                        ? "Unidad"
                        : invoiceLocale === "nl"
                          ? "Eenheid"
                          : "Unit"}
                    </span>
                    <div className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/40 p-0.5">
                      <button
                        type="button"
                        onClick={() => setQuantityUnit("qty")}
                        className={`rounded-[6px] px-2.5 py-1 text-xs font-medium ${
                          quantityUnit === "qty"
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-300 hover:text-zinc-100"
                        }`}
                      >
                        {invoiceLocale === "es"
                          ? "Cant."
                          : invoiceLocale === "nl"
                            ? "Aantal"
                            : "Qty"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuantityUnit("hours")}
                        className={`rounded-[6px] px-2.5 py-1 text-xs font-medium ${
                          quantityUnit === "hours"
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-300 hover:text-zinc-100"
                        }`}
                      >
                        {invoiceLocale === "es"
                          ? "Horas"
                          : invoiceLocale === "nl"
                            ? "Uren"
                            : "Hours"}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm text-zinc-300">
                        {quantityUnit === "hours"
                          ? invoiceLocale === "es"
                            ? "Horas"
                            : invoiceLocale === "nl"
                              ? "Uren"
                              : "Hours"
                          : invoiceLocale === "es"
                            ? "Cantidad"
                            : invoiceLocale === "nl"
                              ? "Aantal"
                              : "Quantity"}
                      </span>
                      {quantityUnit === "hours" ? (
                        <>
                          <input
                            type="hidden"
                            name="quantity"
                            value={String(parseHoursInputToDecimal(quantity) ?? "")}
                          />
                          <input
                            name="quantity_hours"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 2:30"
                            required
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
                          />
                          <p className="text-xs text-zinc-500">
                            {(invoiceLocale === "es"
                              ? "Formato: H:MM (o decimal). Calculamos en horas decimales."
                              : invoiceLocale === "nl"
                                ? "Formaat: U:MM (of decimaal). We rekenen in decimale uren."
                                : "Format: H:MM (or decimal). We calculate using decimal hours.")}
                            {Number.isFinite(quantityNum) && quantityNum > 0 ? (
                              <>
                                {" "}
                                {invoiceLocale === "es"
                                  ? "Se convierte a"
                                  : invoiceLocale === "nl"
                                    ? "Wordt"
                                    : "Converts to"}{" "}
                                <span className="font-mono text-zinc-400">
                                  {quantityNum.toFixed(4)}
                                </span>
                                .
                              </>
                            ) : null}
                          </p>
                        </>
                      ) : (
                        <input
                          name="quantity"
                          type="number"
                          min="0.0001"
                          step="any"
                          required
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
                        />
                      )}
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-zinc-300">
                        {quantityUnit === "hours"
                          ? invoiceLocale === "es"
                            ? "Tarifa por hora (sin IVA)"
                            : invoiceLocale === "nl"
                              ? "Uurtarief (excl. BTW)"
                              : "Hourly rate (ex VAT)"
                          : invoiceLocale === "es"
                            ? "Precio unitario (sin IVA)"
                            : invoiceLocale === "nl"
                              ? "Stukprijs (excl. BTW)"
                              : "Unit price (ex VAT)"}
                      </span>
                      <input
                        name="amount_ex_vat"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
                      />
                    </label>
                  </div>

                  <label className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <span className="text-sm text-zinc-200">Include VAT</span>
                    <input type="hidden" name="vat_enabled" value="false" />
                    <input
                      name="vat_enabled"
                      type="checkbox"
                      value="true"
                      checked={includeVat}
                      onChange={(e) => setIncludeVat(e.target.checked)}
                      className="h-4 w-4 accent-sky-500"
                    />
                  </label>

                  <div className="rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-200">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Line total (ex VAT)</span>
                      <span className="tabular-nums">
                        {lineExVat.toFixed(2)} {currency}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-zinc-400">VAT ({vatPct}%)</span>
                      <span className="tabular-nums">
                        {vatAmount.toFixed(2)} {currency}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-zinc-400">Total (incl. VAT)</span>
                      <span className="tabular-nums">
                        {total.toFixed(2)} {currency}
                      </span>
                    </div>
                    {quantityUnit === "hours" && Number.isFinite(quantityNum) && quantityNum > 0 ? (
                      <div className="mt-2 text-xs text-zinc-500">
                        {invoiceLocale === "es"
                          ? "Mostrado en la factura:"
                          : invoiceLocale === "nl"
                            ? "Weergave op factuur:"
                            : "Displayed on invoice:"}{" "}
                        <span className="font-mono text-zinc-400">
                          {formatDecimalHoursAsHm(quantityNum)}
                        </span>{" "}
                        {invoiceLocale === "es"
                          ? "horas"
                          : invoiceLocale === "nl"
                            ? "uur"
                            : "hours"}
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={createPending || closingAfterCreate}
                      className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        {createPending || closingAfterCreate ? (
                          <span
                            className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                            aria-hidden="true"
                          />
                        ) : null}
                        {createPending
                          ? "Creating invoice…"
                          : closingAfterCreate
                            ? "Updating…"
                            : "Create invoice"}
                      </span>
                    </button>
                  </div>

                  {createFeedback ? (
                    <div
                      className="rounded-md border border-amber-900/50 bg-amber-950/25 px-3 py-2 text-xs text-amber-100"
                      role="alert"
                    >
                      {createFeedback}
                    </div>
                  ) : null}
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
