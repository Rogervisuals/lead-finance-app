import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import type { Locale } from "@/lib/i18n/locale";

export function toISODateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatMonthYearLabel(year: number, monthIndex0: number, locale: Locale) {
  const d = new Date(year, monthIndex0, 1);
  return d.toLocaleString(intlLocaleTag(locale), { month: "long", year: "numeric" });
}

/** Calendar year only (e.g. "2026"), for full-year range labels / PDF reporting period. */
export function formatYearLabel(year: number, locale: Locale) {
  const d = new Date(year, 0, 1);
  return d.toLocaleString(intlLocaleTag(locale), { year: "numeric" });
}

/** Earliest year shown in dashboard / general-expenses range dropdowns. */
export const DASHBOARD_RANGE_MIN_YEAR = 2020;

export type DashboardRangeKind = "month" | "all" | "custom" | "year";

export type DashboardRangeMeta = {
  kind: DashboardRangeKind;
  label: string;
  monthStart: Date | null;
  monthEndExclusive: Date | null;
  /** Inclusive end date (only for kind === "custom") */
  customEndInclusive?: string;
};

/**
 * Resolves the dashboard / report time range from `range` (month selector or all)
 * or an explicit inclusive date pair (`from` / `to` as YYYY-MM-DD).
 */
export function resolveDashboardOrCustomRange({
  year,
  monthIndex0,
  range,
  from,
  to,
  locale,
  allTimeLabel,
}: {
  year: number;
  monthIndex0: number;
  range?: string;
  from?: string | null;
  to?: string | null;
  locale: Locale;
  allTimeLabel: string;
}): DashboardRangeMeta {
  const fromS = String(from ?? "").trim();
  const toS = String(to ?? "").trim();
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (fromS && toS && dateRe.test(fromS) && dateRe.test(toS)) {
    const a = new Date(`${fromS}T00:00:00`);
    const b = new Date(`${toS}T00:00:00`);
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && a <= b) {
      const endExclusive = new Date(b);
      endExclusive.setDate(endExclusive.getDate() + 1);
      return {
        kind: "custom",
        label: `${fromS} – ${toS}`,
        monthStart: a,
        monthEndExclusive: endExclusive,
        customEndInclusive: toS,
      };
    }
  }

  const currentMonthStart = new Date(year, monthIndex0, 1);
  const currentMonthEndExclusive = new Date(year, monthIndex0 + 1, 1);

  if (!range) {
    return {
      kind: "month",
      label: formatMonthYearLabel(year, monthIndex0, locale),
      monthStart: currentMonthStart,
      monthEndExclusive: currentMonthEndExclusive,
    };
  }

  if (range === "all") {
    return {
      kind: "all",
      label: allTimeLabel,
      monthStart: null,
      monthEndExclusive: null,
    };
  }

  const yearMatch = /^year-(\d{4})$/.exec(range);
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    const start = new Date(y, 0, 1);
    const endExclusive = new Date(y + 1, 0, 1);
    return {
      kind: "year",
      label: formatYearLabel(y, locale),
      monthStart: start,
      monthEndExclusive: endExclusive,
    };
  }

  const monthMatch = /^month-(\d{4})-(\d{2})$/.exec(range);
  if (monthMatch) {
    const y = Number(monthMatch[1]);
    const m = Number(monthMatch[2]) - 1;
    const start = new Date(y, m, 1);
    const endExclusive = new Date(y, m + 1, 1);
    const label = formatMonthYearLabel(y, m, locale);
    return { kind: "month", label, monthStart: start, monthEndExclusive: endExclusive };
  }

  return {
    kind: "month",
    label: formatMonthYearLabel(year, monthIndex0, locale),
    monthStart: currentMonthStart,
    monthEndExclusive: currentMonthEndExclusive,
  };
}
