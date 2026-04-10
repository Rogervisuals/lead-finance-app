"use client";

import { useMemo, useState } from "react";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const INVOICE_CURRENCIES = ["EUR", "USD"] as const;

export function CreateInvoiceModal({
  clientName,
  projectName,
  projectId,
  vatPercentageDefault,
  vatEnabledDefault,
  defaultInvoiceCurrency,
  returnTo,
  createInvoiceAction,
}: {
  clientName: string;
  projectName: string;
  projectId: string;
  vatPercentageDefault: number;
  vatEnabledDefault: boolean;
  /** EUR or USD; used as the initial selection when creating an invoice. */
  defaultInvoiceCurrency: "EUR" | "USD";
  returnTo: string;
  createInvoiceAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [includeVat, setIncludeVat] = useState(vatEnabledDefault);
  const [currency, setCurrency] = useState<"EUR" | "USD">(defaultInvoiceCurrency);

  const amountNum = Number(amount || 0);
  const quantityNum = Number(quantity || 0);
  const vatPct = vatPercentageDefault ?? 21;

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
      >
        Create Invoice
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-invoice-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl shadow-black/50"
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

            <form action={createInvoiceAction} className="grid gap-3">
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="vat_percentage" value={String(vatPct)} />

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

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm text-zinc-300">Quantity</span>
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
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-zinc-300">Unit price (ex VAT)</span>
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
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Create invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

