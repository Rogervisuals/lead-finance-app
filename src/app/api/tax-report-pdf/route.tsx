import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveDashboardOrCustomRange } from "@/lib/dashboard-date-range";
import { getOrCreateUserSettingsForSettingsPage } from "@/lib/user-settings";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { fetchTaxReportData } from "@/lib/reports/fetch-tax-report-data";
import { TaxReportDocument } from "@/lib/reports/TaxReportDocument";
import { ensureSubscriptionAndGetPlan } from "@/lib/subscription/plan";
import { canExportDataPdf } from "@/lib/permissions";

export const runtime = "nodejs";

function safeFilenamePart(s: string) {
  return s.replace(/[^\w\-]+/g, "_").slice(0, 80);
}

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const plan = await ensureSubscriptionAndGetPlan(supabase, user.id);
  if (!canExportDataPdf(plan)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const locale = getServerLocale();
  const ui = getUi(locale);
  const now = new Date();

  const meta = resolveDashboardOrCustomRange({
    year: now.getFullYear(),
    monthIndex0: now.getMonth(),
    range,
    from,
    to,
    locale,
    allTimeLabel: ui.dashboard.allTimeLabel,
  });

  const { financialSettings, row } = await getOrCreateUserSettingsForSettingsPage(user.id);
  const businessName =
    row.business_name?.trim() || row.full_name?.trim() || user.email || "User";

  const payload = await fetchTaxReportData(supabase, user.id, meta, {
    businessName,
    baseCurrency: financialSettings.base_currency,
    reportingPeriodLabel: meta.label,
    exportDate: new Date(),
  });

  // @ts-expect-error react-pdf renderToBuffer typings expect <Document>; TaxReportDocument renders Document.
  const buffer = await renderToBuffer(createElement(TaxReportDocument, { data: payload }));

  const stamp = safeFilenamePart(now.toISOString().slice(0, 10));
  const filename = `tax-report_${stamp}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
