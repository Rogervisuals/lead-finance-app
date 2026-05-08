"use client";

import { useMemo } from "react";
import { renderAsteriskBold } from "@/lib/invoices/render-asterisk-bold";
import type { InvoiceLocale } from "@/lib/invoices/invoice-locale";

type InvoiceLike = {
  id: string;
  created_at: string | null;
  amount_ex_vat: number | string | null;
  vat_enabled: boolean | null;
  vat_percentage: number | string | null;
  vat_amount: number | string | null;
  total_amount: number | string | null;
  status: string | null;
  description?: string | null;
  /** Line quantity; amount_ex_vat is line total (unit price × qty). */
  quantity?: number | string | null;
  /** Display-only label for PDF quantity column. */
  quantity_unit?: "qty" | "hours" | string | null;
  currency?: string | null;
  thank_you_message?: string | null;
  payment_information?: string | null;
};

function toMoney(n: unknown) {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function formatQuantity(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "1";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatHoursFromDecimal(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0:00";
  const totalMinutes = Math.round(n * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.abs(totalMinutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function englishOrdinalSuffix(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function toInvoicePdfDate(iso: string | null, locale: InvoiceLocale) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  // Match requested formats:
  // - English: "May 6th 2026"
  // - Spanish: "DD/MM/YYYY" (European numeric)
  // - Dutch: "DD-MM-YYYY"
  if (locale === "en") {
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(d);
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}${englishOrdinalSuffix(day)} ${year}`;
  }

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return locale === "nl" ? `${dd}-${mm}-${yyyy}` : `${dd}/${mm}/${yyyy}`;
}

export function InvoiceTemplate({
  invoice,
  client,
  project,
  business,
  currency = "EUR",
  locale = "en",
}: {
  invoice: InvoiceLike;
  client: {
    name: string;
    email?: string | null;
    company?: string | null;
    address?: string | null;
  };
  project: { name: string; description?: string | null };
  business: {
    business_name: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    iban?: string | null;
    bic?: string | null;
    vat_number?: string | null;
    kvk_number?: string | null;
    address?: string | null;
    /** Public URL for invoice PDF (Supabase Storage). */
    invoice_logo_url?: string | null;
  };
  currency?: string;
  locale?: InvoiceLocale;
}) {
  const t = useMemo(() => {
    if (locale === "es") {
      return {
        invoiceTitle: "FACTURA",
        date: "Fecha",
        from: "De",
        billTo: "Facturar a",
        details: "Detalles",
        project: "Proyecto",
        description: "Descripción",
        qty: "Cant.",
        hours: "Horas",
        price: "Precio",
        amount: "Importe",
        subtotal: "Subtotal",
        vat: "IVA",
        total: "TOTAL",
        paymentInformation: "Información de pago",
        phone: "Teléfono",
        website: "Sitio web",
        email: "Correo",
        logo: "LOGO",
        iban: "IBAN",
        bic: "BIC",
        vatNumber: "NIF / IVA",
        kvk: "Registro mercantil",
      } as const;
    }
    if (locale === "nl") {
      return {
        invoiceTitle: "FACTUUR",
        date: "Datum",
        from: "Van",
        billTo: "Factuur aan",
        details: "Details",
        project: "Project",
        description: "Omschrijving",
        qty: "Aantal",
        hours: "Uren",
        price: "Prijs",
        amount: "Bedrag",
        subtotal: "Subtotaal",
        vat: "BTW",
        total: "TOTAAL",
        paymentInformation: "Betaalinformatie",
        phone: "Telefoon",
        website: "Website",
        email: "E-mail",
        logo: "LOGO",
        iban: "IBAN",
        bic: "BIC",
        vatNumber: "BTW-nummer",
        kvk: "KvK",
      } as const;
    }
    return {
      invoiceTitle: "INVOICE",
      date: "Date",
      from: "From",
      billTo: "Bill to",
      details: "Details",
      project: "Project",
      description: "Description",
      qty: "Qty",
      hours: "Hours",
      price: "Price",
      amount: "Amount",
      subtotal: "Subtotal",
      vat: "VAT",
      total: "TOTAL",
      paymentInformation: "Payment information",
      phone: "Phone",
      website: "Website",
      email: "Email",
      logo: "LOGO",
      iban: "IBAN",
      bic: "BIC",
      vatNumber: "VAT",
      kvk: "KvK",
    } as const;
  }, [locale]);

  const fmt = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale === "nl" ? "nl-NL" : locale === "es" ? "es-ES" : "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(locale === "nl" ? "nl-NL" : locale === "es" ? "es-ES" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }, [currency, locale]);

  const amountEx = toMoney(invoice.amount_ex_vat);
  const qtyRaw = toMoney(invoice.quantity);
  const lineQty = qtyRaw > 0 ? qtyRaw : 1;
  const unitEx = roundMoney(amountEx / lineQty);
  const vatEnabled = Boolean(invoice.vat_enabled);
  const vatPct = toMoney(invoice.vat_percentage);
  const vatAmount = vatEnabled ? toMoney(invoice.vat_amount) : 0;
  const total = vatEnabled ? toMoney(invoice.total_amount) : amountEx;

  const invoiceNo = String(invoice.id).slice(0, 8).toUpperCase();
  const showLine = (v: unknown) => String(v ?? "").trim().length > 0;
  const quantityUnit =
    String(invoice.quantity_unit ?? "").trim().toLowerCase() === "hours"
      ? "hours"
      : "qty";

  return (
    <div
      className="bg-white text-black"
      style={{
        width: "100%",
        // Slightly narrower with more padding so PDF capture never clips edges.
        maxWidth: 760,
        margin: "0 auto",
        padding: 40,
        boxSizing: "border-box",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
        <div style={{ flex: 1 }}>
          {showLine(business.invoice_logo_url) ? (
            // Plain <img> (not next/image): html2canvas/PDF capture expects a simple URL-backed image node.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(business.invoice_logo_url)}
              alt=""
              crossOrigin="anonymous"
              style={{
                display: "block",
                maxWidth: 180,
                maxHeight: 56,
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
            />
          ) : (
            // Keep space but render nothing when there's no logo.
            <div style={{ width: 180, height: 56 }} />
          )}
        </div>

        <div style={{ textAlign: "right", flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>
            {t.invoiceTitle}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#374151" }}>
            <span style={{ color: "#111827", fontWeight: 700 }}>
              #{invoiceNo}
            </span>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>
            {t.date}:{" "}
            <span style={{ color: "#111827" }}>
              {toInvoicePdfDate(invoice.created_at, locale)}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "#E5E7EB",
          marginTop: 20,
          marginBottom: 20,
        }}
      />

      {/* From / Bill to */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#111827",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {t.from}
          </div>
          <div style={{ fontSize: 12, marginTop: 10, color: "#111827" }}>
            {showLine(business.business_name) ? (
              <div style={{ fontWeight: 700 }}>{business.business_name}</div>
            ) : null}
            {showLine(business.full_name) ? (
              <div style={{color: "#374151" }}>
                {business.full_name}
              </div>
            ) : null}
            {showLine(business.address) ? (
              <div
                style={{
                  color: "#374151",
                  whiteSpace: "pre-line",
                }}
              >
                {business.address}
              </div>
            ) : null}
            {showLine(business.phone) ? (
              <div style={{marginTop: 10, color: "#374151" }}>
                <b>{t.phone}:  </b>
                {business.phone}
              </div>
            ) : null}
            {showLine(business.website) ? (
              <div style={{color: "#374151" }}>
                <b>{t.website}:  </b>
                {business.website}
              </div>
            ) : null}
            {showLine(business.email) ? (
              <div style={{color: "#374151" }}>
                <b>{t.email}:  </b>
                {business.email}
              </div>
            ) : null}
            {showLine(business.iban) ? (
              <div style={{ marginTop: 3, color: "#374151" }}>
                <b>{t.iban}:  </b>
                <span style={{ color: "#111827" }}>{business.iban}</span>
              </div>
            ) : null}
            {showLine(business.bic) ? (
              <div style={{ marginTop: 3, color: "#374151" }}>
                <b>{t.bic}:  </b>
                <span style={{ color: "#111827" }}>{business.bic}</span>
              </div>
            ) : null}
            {business.vat_number || business.kvk_number ? (
              <div style={{ fontSize: 11, marginTop: 8, color: "#6B7280" }}>
                {business.vat_number ? `${t.vatNumber}: ${business.vat_number}` : null}
                {business.vat_number && business.kvk_number ? " · " : null}
                {business.kvk_number ? `${t.kvk}: ${business.kvk_number}` : null}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#111827",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {t.billTo}
          </div>
          <div style={{ fontSize: 12, marginTop: 10, color: "#111827" }}>
            {showLine(client.company) ? (
              <div style={{ fontWeight: 700 }}>{client.company}</div>
            ) : null}
            <div style={{ fontWeight: showLine(client.company) ? 400 : 700 }}>
              {client.name}
            </div>

            {showLine(client.address) ? (
              <div
                style={{
                  color: "#374151",
                  whiteSpace: "pre-line",
                }}
              >
                {client.address}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#111827",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {t.details}
        </div>
        <div style={{ fontSize: 12, marginTop: 10, color: "#111827" }}>
          <div>
            {t.project}: <span style={{ fontWeight: 700 }}>{project.name}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 52px minmax(72px,auto) minmax(88px,auto)",
            gap: 10,
            padding: "5px 12px 20px 14px",
            background: "#F3F4F6",
            border: "1px solid #E5E7EB",
            borderBottom: "1px solid #E5E7EB",
            fontSize: 12,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          <div>{t.description}</div>
          <div style={{ textAlign: "right" }}>
            {quantityUnit === "hours" ? t.hours : t.qty}
          </div>
          <div style={{ textAlign: "right" }}>{t.price}</div>
          <div style={{ textAlign: "right" }}>{t.amount}</div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 52px minmax(72px,auto) minmax(88px,auto)",
            gap: 10,
            padding: "5px 12px 20px 14px",
            borderLeft: "1px solid #E5E7EB",
            borderRight: "1px solid #E5E7EB",
            borderBottom: "1px solid #E5E7EB",
            fontSize: 12,
            color: "#111827",
          }}
        >
          <div style={{ color: "#111827" }}>
            {showLine(invoice.description) ? String(invoice.description) : project.name}
          </div>
          <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {quantityUnit === "hours" ? formatHoursFromDecimal(lineQty) : formatQuantity(lineQty)}
          </div>
          <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {fmt.format(unitEx)}
          </div>
          <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {fmt.format(amountEx)}
          </div>
        </div>

        {/* Total block */}
        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 340 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#374151",
                paddingTop: 6,
              }}
            >
              <div>{t.subtotal}</div>
              <div style={{ fontVariantNumeric: "tabular-nums", color: "#111827" }}>
                {fmt.format(amountEx)}
              </div>
            </div>
            {vatEnabled ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#374151",
                  paddingTop: 6,
                }}
              >
                <div>
                  {t.vat} ({vatPct}%)
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums", color: "#111827" }}>
                  {fmt.format(vatAmount)}
                </div>
              </div>
            ) : null}
            <div
              style={{
                height: 1,
                background: "#E5E7EB",
                marginTop: 10,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 16,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              <div>{t.total}</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt.format(total)}
              </div>
            </div>
          </div>
        </div>

        {showLine(invoice.thank_you_message) || showLine(invoice.payment_information) ? (
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #E5E7EB" }}>
            {showLine(invoice.thank_you_message) ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#111827",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.55,
                }}
              >
                {renderAsteriskBold(String(invoice.thank_you_message), "ty")}
              </div>
            ) : null}
            {showLine(invoice.payment_information) ? (
              <div style={{ marginTop: showLine(invoice.thank_you_message) ? 22 : 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#111827",
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  {t.paymentInformation}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 10,
                    color: "#111827",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55,
                  }}
                >
                  {renderAsteriskBold(String(invoice.payment_information), "pay")}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

