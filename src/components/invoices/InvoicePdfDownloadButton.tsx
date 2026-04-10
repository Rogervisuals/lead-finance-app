"use client";

import { useCallback, useState } from "react";
import { InvoiceTemplate } from "@/components/invoices/InvoiceTemplate";
import { flushSync } from "react-dom";

type InvoiceRow = {
  id: string;
  created_at: string | null;
  amount_ex_vat: number | string | null;
  vat_enabled: boolean | null;
  vat_percentage: number | string | null;
  vat_amount: number | string | null;
  total_amount: number | string | null;
  status: string | null;
  description?: string | null;
  quantity?: number | string | null;
  /** Stored invoice currency (EUR or USD). */
  currency?: string | null;
};

export function InvoicePdfDownloadButton({
  invoice,
  client,
  project,
  business,
  currency,
}: {
  invoice: InvoiceRow;
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
    invoice_logo_url?: string | null;
  };
  currency: string;
}) {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Create a dedicated render container (html2pdf/html2canvas can't render display:none).
      const existing = document.getElementById("invoice-pdf");
      if (existing) existing.remove();

      const container = document.createElement("div");
      container.id = "invoice-pdf";
      // Render at (0,0) but behind the app so it doesn't flash.
      // Some browsers capture blank canvases when the target is translated far off-screen.
      container.style.position = "fixed";
      container.style.left = "0";
      container.style.top = "0";
      container.style.transform = "none";
      // Keep it out of view without breaking capture.
      container.style.zIndex = "-1";
      container.style.visibility = "visible";
      container.style.background = "white";
      container.style.color = "black";
      // Slightly wider than the template's max width to avoid edge cropping.
      container.style.width = "920px";
      container.style.maxWidth = "920px";
      container.style.overflow = "visible";
      container.style.boxSizing = "border-box";
      container.style.pointerEvents = "none";
      document.body.appendChild(container);

      // Render the invoice into the container.
      const { createRoot } = await import("react-dom/client");
      const root = createRoot(container);
      flushSync(() => {
        root.render(
          <InvoiceTemplate
            invoice={invoice}
            client={client}
            project={project}
            business={business}
            currency={currency}
          />,
        );
      });

      // Verify element exists before generating.
      const el = document.getElementById("invoice-pdf");
      console.log("[invoice-pdf] element exists:", Boolean(el));
      if (!el) {
        console.error("[invoice-pdf] element is null. Aborting PDF generation.");
        root.unmount();
        container.remove();
        return;
      }

      // Wait for layout/paint before html2canvas snapshots it.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise((r) => setTimeout(r, 250));

      const rect = el.getBoundingClientRect();
      console.log("[invoice-pdf] size:", {
        width: rect.width,
        height: rect.height,
        htmlLength: el.innerHTML.length,
      });
      if (rect.width < 10 || rect.height < 10 || el.innerHTML.length < 50) {
        console.error("[invoice-pdf] element not painted (blank). Aborting.");
        root.unmount();
        container.remove();
        return;
      }

      const mod: any = await import("html2pdf.js");
      const html2pdf = mod?.default ?? mod;

      const targetWidth = Math.ceil(el.scrollWidth || rect.width || 920);
      const targetHeight = Math.ceil(el.scrollHeight || rect.height || 1120);
      const clean = (str: string) => str.replace(/\s+/g, '');

      await html2pdf()
        .set({
          margin: 10,
          filename: `${clean(client.name)}_${clean(project.name)}-invoice.pdf`,
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            windowWidth: targetWidth,
            windowHeight: targetHeight,
            width: targetWidth,
            height: targetHeight,
            onclone: (doc: Document) => {
              // Remove default page margins that can shift the capture.
              doc.documentElement.style.margin = "0";
              doc.documentElement.style.padding = "0";
              doc.body.style.margin = "0";
              doc.body.style.padding = "0";
              // Center content inside the cloned document.
              doc.body.style.display = "flex";
              doc.body.style.justifyContent = "center";
              doc.body.style.alignItems = "flex-start";
              const cloned = doc.getElementById("invoice-pdf");
              if (cloned) {
                const s = (cloned as HTMLElement).style;
                s.position = "static";
                s.left = "0";
                s.top = "0";
                s.transform = "none";
                s.zIndex = "0";
                s.visibility = "visible";
                s.background = "white";
                s.color = "black";
                s.width = `${targetWidth}px`;
                s.maxWidth = `${targetWidth}px`;
                s.boxSizing = "border-box";
              }
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();

      root.unmount();
      container.remove();
    } finally {
      setBusy(false);
    }
  }, [busy, invoice, client, project, business, currency]);

  return (
    <>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="rounded-md border border-zinc-800 bg-zinc-950/20 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/40 disabled:opacity-60"
        title="Download PDF"
        aria-label="Download PDF"
      >
        PDF
      </button>
    </>
  );
}

