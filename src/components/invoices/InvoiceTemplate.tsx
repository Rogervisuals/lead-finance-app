"use client";

import { useMemo } from "react";

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
  currency?: string | null;
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

function toDateOnly(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export function InvoiceTemplate({
  invoice,
  client,
  project,
  business,
  currency = "EUR",
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
    vat_number?: string | null;
    kvk_number?: string | null;
    address?: string | null;
    /** Public URL for invoice PDF (Supabase Storage). */
    invoice_logo_url?: string | null;
  };
  currency?: string;
}) {
  const fmt = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }, [currency]);

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
            <div
              style={{
                width: 180,
                height: 56,
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6B7280",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              LOGO
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>
            INVOICE
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#374151" }}>
            <span style={{ color: "#111827", fontWeight: 700 }}>
              #{invoiceNo}
            </span>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>
            Date:{" "}
            <span style={{ color: "#111827" }}>
              {toDateOnly(invoice.created_at)}
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
            From
          </div>
          <div style={{ fontSize: 12, marginTop: 10, color: "#111827" }}>
            <div style={{ fontWeight: 700 }}>
              {business.business_name || "Rogervisuals"}
            </div>
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
                <b>Phone:  </b>{business.phone}
              </div>
            ) : null}
            {showLine(business.website) ? (
              <div style={{color: "#374151" }}>
                <b>Website:  </b>{business.website}
              </div>
            ) : null}
            {showLine(business.email) ? (
              <div style={{color: "#374151" }}>
                <b>Email:  </b>{business.email}
              </div>
            ) : null}
            {showLine(business.iban) ? (
              <div style={{ marginTop: 3, color: "#374151" }}>
                <b>IBAN:  </b><span style={{ color: "#111827" }}>{business.iban}</span>
              </div>
            ) : null}
            {business.vat_number || business.kvk_number ? (
              <div style={{ fontSize: 11, marginTop: 8, color: "#6B7280" }}>
                {business.vat_number ? `VAT: ${business.vat_number}` : null}
                {business.vat_number && business.kvk_number ? " · " : null}
                {business.kvk_number ? `KvK: ${business.kvk_number}` : null}
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
            Bill to
          </div>
          <div style={{ fontSize: 12, marginTop: 10, color: "#111827" }}>
            {showLine(client.company) ? (
              <div style={{ fontWeight: 700 }}>{client.company}</div>
            ) : null}
            <div style={{ fontWeight: showLine(client.company) ? 400 : 700 }}>
              {client.name}
            </div>
            {showLine(client.email) ? (
              <div style={{color: "#374151" }}>{client.email}</div>
            ) : null}
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
          Details
        </div>
        <div style={{ fontSize: 12, marginTop: 10, color: "#111827" }}>
          <div>
            Project: <span style={{ fontWeight: 700 }}>{project.name}</span>
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
          <div>Description</div>
          <div style={{ textAlign: "right" }}>Qty</div>
          <div style={{ textAlign: "right" }}>Price</div>
          <div style={{ textAlign: "right" }}>Amount</div>
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
            {formatQuantity(lineQty)}
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
              <div>Subtotal</div>
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
                <div>VAT ({vatPct}%)</div>
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
              <div>TOTAL</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt.format(total)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

