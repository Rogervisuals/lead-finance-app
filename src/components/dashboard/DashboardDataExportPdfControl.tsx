"use client";

import { useEffect, useMemo, useState } from "react";
import { config } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

config.autoAddCss = false;

export type ExportRangeOption = { value: string; label: string };

export function DashboardDataExportPdfControl({
  pdfBaseHref,
  canExport,
  label,
  lockedTitle,
  title,
  rangeLabel,
  formatLabel,
  exportLabel,
  helpText,
  rangeOptions,
  initialRangeValue,
  businessName,
}: {
  pdfBaseHref: string;
  canExport: boolean;
  label: string;
  lockedTitle: string;
  title: string;
  rangeLabel: string;
  formatLabel: string;
  exportLabel: string;
  helpText: string;
  rangeOptions: ExportRangeOption[];
  initialRangeValue: string;
  businessName: string;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(initialRangeValue);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    // Keep selection in sync if user changes dashboard range and reopens.
    setRange(initialRangeValue);
  }, [initialRangeValue]);

  useEffect(() => {
    if (!open) {
      setDownloading(false);
      setDownloaded(false);
      setDownloadError(null);
    }
  }, [open]);

  const pdfHref = useMemo(() => {
    const base = pdfBaseHref || "/api/tax-report-pdf";
    if (!range || range === "all") return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}range=${encodeURIComponent(range)}`;
  }, [pdfBaseHref, range]);

  const periodLabel = useMemo(() => {
    return rangeOptions.find((o) => o.value === range)?.label ?? range ?? "All";
  }, [rangeOptions, range]);

  function safeFilenamePart(s: string) {
    return String(s ?? "")
      .trim()
      .replace(/[^\w\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  async function downloadPdf() {
    setDownloadError(null);
    setDownloaded(false);
    setDownloading(true);
    try {
      const res = await fetch(pdfHref, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = safeFilenamePart(businessName || "User") || "User";
      const period = safeFilenamePart(periodLabel || "All") || "All";
      a.download = `FinancialReport-${name}-${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  if (canExport) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-zinc-700 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600 hover:bg-zinc-900"
        >
          {label}
        </button>

        {open ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(e) => {
              if (downloading) return;
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur">
              <div className="text-lg font-semibold text-zinc-100">{title}</div>

              <div className="mt-4 space-y-3">
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-400">{rangeLabel}</div>
                  <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    disabled={downloading}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {rangeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <div className="text-xs font-medium text-zinc-400">{formatLabel}</div>
                  <select
                    value="pdf"
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-500 outline-none"
                  >
                    <option value="pdf">PDF</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading}
                className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {exportLabel}
              </button>
              <div className="mt-3 text-center text-xs text-zinc-500">
                {downloading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200"
                      aria-hidden
                    />
                    Your PDF is being downloaded…
                  </span>
                ) : downloaded ? (
                  <span className="text-emerald-300">Downloaded.</span>
                ) : downloadError ? (
                  <span className="text-rose-300">{downloadError}</span>
                ) : (
                  helpText
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={downloading}
                  className="rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      className="relative inline-flex cursor-not-allowed"
      title={lockedTitle}
      aria-label={`${label}. ${lockedTitle}`}
    >
      <span className="rounded-md border border-zinc-800/90 bg-zinc-950/25 px-3 py-2 text-sm text-zinc-500 opacity-80">
        {label}
      </span>
      <span className="pointer-events-none absolute -right-1.5 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-amber-500/95 shadow-md ring-2 ring-zinc-950">
        <FontAwesomeIcon icon={faLock} className="h-3 w-3" aria-hidden />
      </span>
    </div>
  );
}
