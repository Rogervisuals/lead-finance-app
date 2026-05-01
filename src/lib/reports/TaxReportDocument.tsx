import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Path,
} from "@react-pdf/renderer";
import type { TaxReportPayload } from "./fetch-tax-report-data";

const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 40,
    paddingHorizontal: 38,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111",
  },
  docTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  docBrand: {
    fontSize: 11,
    color: "#2b64ff",
    marginBottom: 0,
    fontFamily: "Helvetica-Oblique",
  },
  meta: { fontSize: 9.5, color: "#333", marginBottom: 2 },
  note: {
    fontSize: 8.5,
    color: "#555",
    marginTop: 10,
    marginBottom: 6,
    lineHeight: 1.35,
  },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 5,
  },
  summaryBox: {
    borderWidth: 0.5,
    borderColor: "#999",
    padding: 8,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  summaryLabel: { fontFamily: "Helvetica-Bold", width: "55%" },
  summaryValue: { textAlign: "right", width: "45%" },
  tableTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 4,
  },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 3,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.25,
    borderBottomColor: "#ccc",
    paddingVertical: 3,
    fontSize: 7.5,
  },
  continued: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#333",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#666",
    textAlign: "center",
  },
  coverGrid: {
    flexDirection: "column",
    gap: 14,
    alignItems: "stretch",
  },
  coverRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "stretch",
  },
  coverColLeft: { width: "50%" },
  coverColRight: { width: "50%" },
  coverFullRow: { width: "100%" },
  coverCard: {
    borderWidth: 0.75,
    borderColor: "#d4d7dd",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#fff",
  },
  coverCardTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: "#111",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  metricLabel: { color: "#444" },
  metricValue: { fontFamily: "Helvetica-Bold" },
  metricMidNote: { color: "#888", fontSize: 8.5 },
  tinyTableHead: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: "#b9bec8",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#333",
  },
  tinyRow: {
    flexDirection: "row",
    borderBottomWidth: 0.25,
    borderBottomColor: "#e3e6eb",
    paddingVertical: 5,
    fontSize: 8.5,
    color: "#222",
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  chartAxisLabel: { fontSize: 8, color: "#555" },
  chartAmountLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#222" },
  quickSentence: {
    fontSize: 11,
    color: "#222",
    marginBottom: 10,
    lineHeight: 1.35,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: "#2b64ff",
    backgroundColor: "#f5f8ff",
  },
  heroTitle: {
    fontSize: 10,
    color: "#2b64ff",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111",
  },
  heroSub: {
    marginTop: 3,
    fontSize: 8.5,
    color: "#555",
  },
  keyBullet: { flexDirection: "row", gap: 6, marginBottom: 6 },
  keyDot: { color: "#2b64ff", fontFamily: "Helvetica-Bold" },
  metaChipRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  metaChip: { fontSize: 8.5, color: "#555" },
  miniChartAxis: { fontSize: 7.5, color: "#666" },
  miniChartLabel: { fontSize: 8, color: "#444", marginTop: 6 },
  miniChartTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 6 },
  miniChartMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  miniChartYLabel: { fontSize: 7.5, color: "#666" },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  headerGenerated: {
    fontSize: 9.5,
    color: "#333",
  },
  headerTitleWrap: {
    marginTop: 6,
  },
  headerPeriod: {
    fontSize: 12.5,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    marginTop: 2,
  },
  headerSpacer: {
    height: 18,
  },
});

function fmtMoney(n: number, currency: string) {
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + ` ${currency}`;
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function fmtHeaderDate(exportDateLabel: string) {
  // exportDateLabel is "YYYY-MM-DD HH:MM:SS UTC" (from server). Render as "May 31, 2026".
  const iso = String(exportDateLabel ?? "").trim().slice(0, 10);
  const d = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : null;
  if (!d || Number.isNaN(d.getTime())) return exportDateLabel;
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

function currencySymbol(code: string) {
  const c = String(code ?? "").trim().toUpperCase();
  if (c === "EUR") return "€";
  if (c === "USD") return "$";
  if (c === "GBP") return "£";
  return c ? `${c} ` : "";
}

function fmtAxisMoney(n: number, currency: string) {
  const sym = currencySymbol(currency);
  try {
    const body = new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(n);
    return `${sym}${body}`;
  } catch {
    return `${sym}${Math.round(n)}`;
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function polarToCartesian(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutSlicePath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number) {
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  const p0 = polarToCartesian(cx, cy, rOuter, a0);
  const p1 = polarToCartesian(cx, cy, rOuter, a1);
  const q0 = polarToCartesian(cx, cy, rInner, a1);
  const q1 = polarToCartesian(cx, cy, rInner, a0);
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p1.x} ${p1.y}`,
    `L ${q0.x} ${q0.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${q1.x} ${q1.y}`,
    "Z",
  ].join(" ");
}

function linePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(" ");
}

function chunkWithFirst<T>(rows: T[], first: number, rest: number): T[][] {
  if (!rows.length) return [];
  const out: T[][] = [];
  out.push(rows.slice(0, first));
  let i = first;
  while (i < rows.length) {
    out.push(rows.slice(i, i + rest));
    i += rest;
  }
  return out;
}

function PageFooter({ page, total }: { page: number; total: number }) {
  if (total <= 1) return null;
  return (
    <Text style={styles.footer} fixed>
      Page {page} of {total}
    </Text>
  );
}

function HeaderBlock({
  data,
}: {
  data: TaxReportPayload;
}) {
  const periodRangeText =
    data.periodStartIso && data.periodEndIso
      ? `${data.periodStartIso} – ${data.periodEndIso}`
      : data.reportingPeriodLabel;
  return (
    <View>
      <View style={styles.headerTopRow}>
        <Text style={styles.docBrand}>Zarlo</Text>
        <Text style={styles.headerGenerated}>
          Generated on {fmtHeaderDate(data.exportDateLabel)}
        </Text>
      </View>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.docTitle}>Financial Report</Text>
        <Text style={styles.headerPeriod}>{data.reportingPeriodLabel}</Text>
        <View style={styles.metaChipRow}>
          <Text style={styles.metaChip}>Period: {periodRangeText}</Text>
          <Text style={styles.metaChip}>Currency: {data.baseCurrency}</Text>
          <Text style={styles.metaChip}>VAT: {data.vatEnabled ? "enabled" : "disabled"}</Text>
        </View>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function CoverOverview({ data }: { data: TaxReportPayload }) {
  const income = data.totalIncome;
  const expProj = data.totalProjectExpenses;
  const expGen = data.totalGeneralExpenses;
  const expTotal = expProj + expGen;

  const STEP = 5000;
  const rawMax = Math.max(0, income, expTotal);
  const axisMax = Math.max(STEP, Math.ceil(rawMax / STEP) * STEP);
  const barMaxH = 120;
  const incomeH = Math.round(barMaxH * clamp01(income / axisMax));
  const expProjH = Math.round(barMaxH * clamp01(expProj / axisMax));
  const expGenH = Math.round(barMaxH * clamp01(expGen / axisMax));
  const axisTicks = Array.from(
    { length: Math.floor(axisMax / STEP) + 1 },
    (_, i) => i * STEP
  );

  const expenseDark = "#c0392b";
  const expenseLight = "#e06b61";
  const incomeGreen = "#2ea44f";

  const donutColors = ["#1f6feb", "#58a6ff", "#79c0ff", "#a5d6ff", "#c9d1d9"];
  const donutSize = 168;
  const cx = donutSize / 2;
  const cy = donutSize / 2;
  const rOuter = 78;
  const rInner = 46;

  let a = -Math.PI / 2;
  const slices = (data.expenseCategories ?? []).filter((s) => s.amount > 0);
  const total = slices.reduce((acc, s) => acc + s.amount, 0);
  const donutPaths = slices.map((s, i) => {
    const frac = total > 0 ? s.amount / total : 0;
    const a0 = a;
    const a1 = a + frac * Math.PI * 2;
    a = a1;
    return { d: donutSlicePath(cx, cy, rOuter, rInner, a0, a1), color: donutColors[i % donutColors.length] };
  });

  const yearOrPeriod = (() => {
    // For the quick sentence, prefer a clean "2025" when label is a year.
    const lbl = String(data.reportingPeriodLabel ?? "").trim();
    const yearMatch = /^\d{4}$/.test(lbl) ? lbl : null;
    return yearMatch ?? lbl;
  })();

  const highestCat = (data.expenseCategories ?? []).reduce(
    (best, cur) => (cur.pct > best.pct ? cur : best),
    { category: "—", amount: 0, pct: 0 }
  );
  const profitMarginPct =
    income > 0 ? Math.round(((data.netProfit / income) * 100) * 10) / 10 : 0;
  const taxImpactPct =
    income > 0 ? Math.round(((data.estimatedTax / income) * 100) * 10) / 10 : 0;

  const bestMonth = (() => {
    const months = (data.monthly ?? []).slice(0, 12);
    if (!months.length) return null;
    let best: { month: string; net: number } | null = null;
    for (const m of months) {
      const net = Number((m as any).net ?? 0);
      if (!best || net > best.net) best = { month: (m as any).month, net };
    }
    if (!best || best.net === 0) return null;
    return best;
  })();

  const keyInsights: string[] = [
    highestCat.pct > 0
      ? `Highest expense category: ${highestCat.category} (${highestCat.pct}%).`
      : "Highest expense category: —",
    income > 0 ? `Profit margin: ${profitMarginPct}%.` : "Profit margin: —",
    income > 0 ? `Tax impact: ${taxImpactPct}% of income.` : "Tax impact: —",
    bestMonth
      ? `Best month (highest net): ${bestMonth.month} (${fmtAxisMoney(bestMonth.net, data.baseCurrency)}).`
      : "Best month (highest net): —",
  ].slice(0, 4);

  // Monthly mini chart (net trend). Uses year breakdown when available.
  // Keep 12 fixed month slots so points align to the correct month label.
  const monthlyAll = (data.monthly ?? []).slice(0, 12);
  const monthSlots =
    monthlyAll.length === 12
      ? monthlyAll
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
          (m) => ({
            month: m,
            income: 0,
            expenses: 0,
            net: 0,
          })
        );

  const miniW = 420;
  const miniH = 76; // plot area height (without x-axis labels)
  const miniPadX = 24;
  const miniPadY = 12;
  const miniPadRight = 24;
  const miniLabelBandH = 15;
  const miniSvgH = miniH + miniLabelBandH;
  const totalMonths = 12;
  const usableChartWidth = miniW - miniPadX - miniPadRight;
  const getX = (index: number) =>
    miniPadX + (index / (totalMonths - 1)) * usableChartWidth;

  if (process.env.LF_PDF_DEBUG_X === "1") {
    // eslint-disable-next-line no-console
    console.log(
      "LF PDF getX positions:",
      Array.from({ length: totalMonths }, (_, i) => Math.round(getX(i) * 100) / 100)
    );
  }
  // Always render all 12 months so points align to labels.
  // Months with no activity remain at 0 (explicit dot + label).
  const netVals = monthSlots.map((m) => Number(m.net ?? 0));
  const hasMini = monthSlots.length === 12 && netVals.some((n) => Number.isFinite(n));

  const minRaw = hasMini ? Math.min(...netVals) : 0;
  const maxRaw = hasMini ? Math.max(...netVals) : 0;
  const allPositive = hasMini ? netVals.every((n) => n >= 0) : true;

  const niceStep = (target: number) => {
    const candidates = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    const t = Math.max(1, Math.abs(target));
    return candidates.find((c) => c >= t) ?? candidates[candidates.length - 1];
  };

  const yMin = hasMini
    ? (allPositive ? 0 : Math.floor(minRaw / niceStep((maxRaw - minRaw) / 3)) * niceStep((maxRaw - minRaw) / 3))
    : 0;
  const yMax = hasMini
    ? Math.ceil(maxRaw / niceStep((maxRaw - yMin) / 3)) * niceStep((maxRaw - yMin) / 3)
    : 0;
  const span = Math.max(1, yMax - yMin);

  const slotPoints = hasMini
    ? monthSlots.map((m, idx) => {
        const x = getX(idx);
        const y =
          miniPadY +
          (1 - (Number(m.net ?? 0) - yMin) / span) * (miniH - miniPadY * 2);
        return { x, y, net: Number(m.net ?? 0) };
      })
    : [];

  const netPath = hasMini ? linePath(slotPoints.map((p) => ({ x: p.x, y: p.y }))) : "";

  const miniTicks = (() => {
    if (!hasMini) return [];
    const step = niceStep((yMax - yMin) / 3);
    const start = Math.floor(yMin / step) * step;
    const end = Math.ceil(yMax / step) * step;
    const out: number[] = [];
    for (let v = start; v <= end; v += step) out.push(v);
    // Ensure 0 is visible when all values are positive.
    if (allPositive && !out.includes(0)) out.unshift(0);
    return out.sort((a, b) => a - b);
  })();

  return (
    <View style={styles.coverGrid}>
      <Text style={styles.quickSentence}>
        In {yearOrPeriod} you generated {fmtMoney(data.totalIncome, data.baseCurrency)} in revenue
        with a net profit of {fmtMoney(data.netProfit, data.baseCurrency)}.
      </Text>

      <View style={styles.coverRow}>
        <View style={styles.coverColLeft}>
          <View style={{ ...styles.coverCard, ...styles.heroCard }}>
            <Text style={styles.heroTitle}>Net Profit</Text>
            <Text style={styles.heroValue}>{fmtMoney(data.netProfit, data.baseCurrency)}</Text>
            <Text style={styles.heroSub}>
              {fmtAxisMoney(data.totalIncome, data.baseCurrency)} income •{" "}
              {fmtAxisMoney(data.totalExpenses, data.baseCurrency)} expenses
            </Text>
          </View>

          <View style={{ height: 10 }} />

          <View style={styles.coverCard}>
            <Text style={styles.coverCardTitle}>Overview</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Net (month)</Text>
              <Text style={styles.metricValue}>{fmtMoney(data.netProfit, data.baseCurrency)}</Text>
            </View>
            {data.vatEnabled ? (
              <>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Income (excl VAT)</Text>
                  <Text style={styles.metricValue}>
                    {fmtMoney(data.totalIncome, data.baseCurrency)}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>
                    {`Income (inc ${Math.round(data.vatPercentage)}% VAT)`}
                  </Text>
                  <Text style={styles.metricMidNote}>
                    {fmtMoney(
                      data.totalIncome * (data.vatPercentage / 100),
                      data.baseCurrency
                    )}
                  </Text>
                  <Text style={styles.metricValue}>
                    {fmtMoney(
                      data.totalIncome * (1 + data.vatPercentage / 100),
                      data.baseCurrency
                    )}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Income (excl VAT)</Text>
                <Text style={styles.metricValue}>
                  {fmtMoney(data.totalIncome, data.baseCurrency)}
                </Text>
              </View>
            )}
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Expenses (month)</Text>
              <Text style={styles.metricValue}>{fmtMoney(data.totalExpenses, data.baseCurrency)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total mileage (km)</Text>
              <Text style={styles.metricValue}>
                {Number.isFinite(data.totalMileageKm) ? data.totalMileageKm.toFixed(2) : "—"}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Estimated tax ({Math.round(data.taxPercentage)}%)</Text>
              <Text style={styles.metricValue}>{fmtMoney(data.estimatedTax, data.baseCurrency)}</Text>
            </View>
            <View style={{ ...styles.metricRow, marginBottom: 0 }}>
              <Text style={styles.metricLabel}>Safe to spend</Text>
              <Text style={styles.metricValue}>{fmtMoney(data.safeToSpend, data.baseCurrency)}</Text>
            </View>
          </View>

          <View style={{ height: 10 }} />

          <View style={styles.coverCard}>
            <Text style={styles.coverCardTitle}>Summary</Text>
            <View style={styles.tinyTableHead}>
              <Text style={{ width: "70%" }}>Category</Text>
              <Text style={{ width: "30%", textAlign: "right" }}>Amount</Text>
            </View>
            {[
              ...(data.vatEnabled
                ? [
                    { label: "Income (excl VAT)", amount: data.totalIncome },
                    {
                      label: `VAT (${Math.round(data.vatPercentage)}%)`,
                      amount: data.totalIncome * (data.vatPercentage / 100),
                    },
                    {
                      label: "Income (inc VAT)",
                      amount: data.totalIncome * (1 + data.vatPercentage / 100),
                    },
                  ]
                : [{ label: "Income", amount: data.totalIncome }]),
              { label: "Expenses — Project", amount: data.totalProjectExpenses },
              { label: "Expenses — General", amount: data.totalGeneralExpenses },
              { label: `Tax (${Math.round(data.taxPercentage)}%)`, amount: data.estimatedTax },
              { label: "Net", amount: data.netProfit },
            ].map((r) => (
              <View style={styles.tinyRow} key={r.label} wrap={false}>
                <Text style={{ width: "70%" }}>{r.label}</Text>
                <Text style={{ width: "30%", textAlign: "right" }}>
                  {fmtMoney(r.amount, data.baseCurrency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.coverColRight}>
          <View style={styles.coverCard}>
            <Text style={styles.coverCardTitle}>Income vs Expenses</Text>
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <View style={{ width: 66, height: barMaxH + 18, justifyContent: "space-between" }}>
                {axisTicks
                  .slice()
                  .reverse()
                  .map((t) => (
                    <Text key={`t-${t}`} style={styles.chartAxisLabel}>
                      {fmtAxisMoney(t, data.baseCurrency)}
                    </Text>
                  ))}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-evenly" }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.chartAmountLabel}>
                      {fmtAxisMoney(income, data.baseCurrency)}
                    </Text>
                    <Svg width={120} height={barMaxH}>
                      <Rect
                        x={52}
                        y={barMaxH - incomeH}
                        width={20}
                        height={incomeH}
                        fill={incomeGreen}
                        rx={3}
                      />
                    </Svg>
                    <Text style={{ fontSize: 9.5, color: "#444" }}>Income</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.chartAmountLabel}>
                      {fmtAxisMoney(expTotal, data.baseCurrency)}
                    </Text>
                    <Svg width={120} height={barMaxH}>
                      <Rect
                        x={52}
                        y={barMaxH - expGenH}
                        width={20}
                        height={expGenH}
                        fill={expenseLight}
                        rx={3}
                      />
                      <Rect
                        x={52}
                        y={barMaxH - (expGenH + expProjH)}
                        width={20}
                        height={expProjH}
                        fill={expenseDark}
                        rx={3}
                      />
                    </Svg>
                    <Text style={{ fontSize: 9.5, color: "#444" }}>Expenses</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 8, flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
              <View style={styles.legendRow}>
                <View style={{ ...styles.legendSwatch, backgroundColor: incomeGreen }} />
                <Text style={{ fontSize: 9, color: "#444" }}>Income</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={{ ...styles.legendSwatch, backgroundColor: expenseDark }} />
                <Text style={{ fontSize: 9, color: "#444" }}>Project expenses</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={{ ...styles.legendSwatch, backgroundColor: expenseLight }} />
                <Text style={{ fontSize: 9, color: "#444" }}>General expenses</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 10 }} />

          <View style={styles.coverCard}>
            <Text style={styles.coverCardTitle}>Key Insights</Text>
            {keyInsights.map((t, i) => (
              <View style={styles.keyBullet} key={`ki-${i}`} wrap={false}>
                <Text style={styles.keyDot}>•</Text>
                <Text style={{ flex: 1, color: "#333", lineHeight: 1.35, maxWidth: 250 }}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.coverFullRow}>
        <View style={styles.coverCard}>
          <Text style={styles.miniChartTitle}>Monthly Net Trend</Text>
          {hasMini ? (
            <>
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: 54, height: miniSvgH, justifyContent: "space-between" }}>
                  {miniTicks
                    .slice()
                    .reverse() // render high at top
                    .map((v, idx) => (
                      <Text key={`yfull-${idx}`} style={styles.miniChartYLabel}>
                        {fmtAxisMoney(v, data.baseCurrency)}
                      </Text>
                    ))}
                </View>
                <Svg width={420} height={miniSvgH}>
                  <Path d={netPath} stroke="#2b64ff" strokeWidth={1.6} fill="none" />
                  {slotPoints.map((p, i) => {
                    const negative = p.net < 0;
                    const isZero = p.net === 0;
                    const fill = negative ? "#c0392b" : isZero ? "#94a3b8" : "#2b64ff";
                    // `Circle` is not reliably rendered across all react-pdf builds/viewers,
                    // so use a tiny square marker instead (more predictable).
                    const size = 5.6;
                    return (
                      <Rect
                        key={`ptfull-${i}`}
                        x={p.x - size / 2}
                        y={p.y - size / 2}
                        width={size}
                        height={size}
                        fill={fill}
                        stroke="#ffffff"
                        strokeWidth={0.8}
                        rx={1.6}
                      />
                    );
                  })}
                  {(() => {
// Value labels above points (always show)
const pts = slotPoints;

return pts.map((p, i) => {
  const v = Number(p.net ?? 0);

  // optioneel: skip alleen echte null/NaN
  if (!Number.isFinite(v)) return null;

  const n = pts.length;

  const x =
    i === 0 ? p.x + 2 : i === n - 1 ? p.x - 2 : p.x;

  const y = p.y - 6;

  const negative = v < 0;

  const textAnchor =
    i === 0 ? "start" : i === n - 1 ? "end" : "middle";

  return (
    <Text
      key={`val-${i}`}
      x={x}
      y={y}
      textAnchor={textAnchor}
      style={{
        fontSize: 7,
        color: negative ? "#c0392b" : "#333",
      }}
    >
      {fmtAxisMoney(v, data.baseCurrency)}
    </Text>
  );
});
                  })()}
                  {monthSlots.map((m, i) => {
                    const x = getX(i);
                    const y = miniH + 13;
                    return (
                      <Text
                        key={`ml-${m.month}-${i}`}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        style={{ fontSize: 7.5, color: "#666" } as any}
                      >
                        {m.month}
                      </Text>
                    );
                  })}
                </Svg>
              </View>
              <Text style={styles.miniChartLabel}>
                Net per month (income - expenses) for {data.reportingPeriodLabel}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 8.5, color: "#555" }}>
              Monthly trend is available for full-year exports.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.coverFullRow}>
        <View style={styles.coverCard} wrap={false}>
          <Text style={styles.coverCardTitle}>Top Expense Categories</Text>
          <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
            <Svg width={donutSize} height={donutSize}>
              {donutPaths.length ? (
                donutPaths.map((p, i) => <Path key={`d-${i}`} d={p.d} fill={p.color} />)
              ) : (
                <Path
                  d={donutSlicePath(cx, cy, rOuter, rInner, 0, Math.PI * 2)}
                  fill="#e3e6eb"
                />
              )}
            </Svg>
            <View style={{ flex: 1 }}>
              {(slices.length ? slices : [{ category: "No expenses", amount: 0, pct: 0 }])
                .slice(0, 5)
                .map((s, i) => (
                  <View
                    key={`${s.category}-${i}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View
                        style={{
                          ...styles.legendSwatch,
                          backgroundColor: donutColors[i % donutColors.length],
                          width: 10,
                          height: 10,
                        }}
                      />
                      <Text style={{ fontSize: 10, color: "#444" }}>{s.category}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: "#444" }}>
                      {String(s.pct ?? 0)}%
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function SummaryBlock({ data }: { data: TaxReportPayload }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={{ ...styles.h2, marginTop: 0 }}>Financial summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total distance (km)</Text>
        <Text style={styles.summaryValue}>
          {Number.isFinite(data.totalMileageKm) ? data.totalMileageKm.toFixed(2) : "—"}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total income</Text>
        <Text style={styles.summaryValue}>{fmtMoney(data.totalIncome, data.baseCurrency)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>
          Total expenses
        </Text>
        <Text style={styles.summaryValue}>{fmtMoney(data.totalExpenses, data.baseCurrency)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>- Project expenses (clients/projects)</Text>
        <Text style={styles.summaryValue}>
          {fmtMoney(data.totalProjectExpenses, data.baseCurrency)}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>- General expenses (business)</Text>
        <Text style={styles.summaryValue}>
          {fmtMoney(data.totalGeneralExpenses, data.baseCurrency)}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Net profit (income - expenses)</Text>
        <Text style={styles.summaryValue}>{fmtMoney(data.netProfit, data.baseCurrency)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total worked hours</Text>
        <Text style={styles.summaryValue}>
          {Number.isFinite(data.totalWorkedHours) ? data.totalWorkedHours.toFixed(2) : "—"}
        </Text>
      </View>
    </View>
  );
}

/** Income table — wide layout */
function IncomeTable({ rows }: { rows: TaxReportPayload["income"] }) {
  return (
    <View>
      <View style={styles.thead}>
        <Text style={{ width: "11%" }}>Date</Text>
        <Text style={{ width: "17%" }}>Client</Text>
        <Text style={{ width: "17%" }}>Company</Text>
        <Text style={{ width: "17%" }}>Project</Text>
        <Text style={{ width: "14%", textAlign: "right" }}>Amount</Text>
        <Text style={{ width: "12%", textAlign: "right" }}>Ccy</Text>
      </View>
      {rows.map((r, i) => (
        <View style={styles.row} key={`i-${i}-${r.date}-${r.clientName}`} wrap={false}>
          <Text style={{ width: "11%" }}>{r.date}</Text>
          <Text style={{ width: "17%" }}>{r.clientName}</Text>
          <Text style={{ width: "17%" }}>{r.company}</Text>
          <Text style={{ width: "17%" }}>{r.projectName}</Text>
          <Text style={{ width: "14%", textAlign: "right" }}>
            {Number.isFinite(r.amount) ? r.amount.toFixed(2) : "—"}
          </Text>
          <Text style={{ width: "12%", textAlign: "right" }}>{r.currency}</Text>
        </View>
      ))}
    </View>
  );
}

function GeneralExpenseTable({ rows }: { rows: TaxReportPayload["generalExpenses"] }) {
  return (
    <View>
      <View style={styles.thead}>
        <Text style={{ width: "14%" }}>Date</Text>
        <Text style={{ width: "30%" }}>Description</Text>
        <Text style={{ width: "14%", textAlign: "right" }}>Amount</Text>
        <Text style={{ width: "10%", textAlign: "right" }}>Ccy</Text>
        <Text style={{ width: "24%", textAlign: "right" }}>Category</Text>
      </View>
      {rows.map((r, i) => (
        <View style={styles.row} key={`ge-${i}-${r.date}`} wrap={false}>
          <Text style={{ width: "14%" }}>{r.date}</Text>
          <Text style={{ width: "30%" }}>{r.description}</Text>
          <Text style={{ width: "14%", textAlign: "right" }}>
            {Number.isFinite(r.amount) ? r.amount.toFixed(2) : "—"}
          </Text>
          <Text style={{ width: "10%", textAlign: "right" }}>{r.currency}</Text>
          <Text style={{ width: "24%", textAlign: "right" }}>{r.category}</Text>
        </View>
      ))}
    </View>
  );
}

function ExpenseTable({ rows }: { rows: TaxReportPayload["expenses"] }) {
  return (
    <View>
      <View style={styles.thead}>
        <Text style={{ width: "14%" }}>Date</Text>
        <Text style={{ width: "14%" }}>Client</Text>
        <Text style={{ width: "16%" }}>Description</Text>
        <Text style={{ width: "14%", textAlign: "right" }}>Amount</Text>
        <Text style={{ width: "10%", textAlign: "right" }}>Ccy</Text>
        <Text style={{ width: "24%", textAlign: "right" }}>Category</Text>
      </View>
      {rows.map((r, i) => (
        <View style={styles.row} key={`e-${i}-${r.date}`} wrap={false}>
          <Text style={{ width: "14%" }}>{r.date}</Text>
          <Text style={{ width: "14%" }}>{r.clientName}</Text>
          <Text style={{ width: "16%" }}>{r.description}</Text>
          <Text style={{ width: "14%", textAlign: "right" }}>
            {Number.isFinite(r.amount) ? r.amount.toFixed(2) : "—"}
          </Text>
          <Text style={{ width: "10%", textAlign: "right" }}>{r.currency}</Text>
          <Text style={{ width: "24%", textAlign: "right" }}>{r.category}</Text>
        </View>
      ))}
    </View>
  );
}

function HoursTable({ rows }: { rows: TaxReportPayload["hours"] }) {
  return (
    <View>
      <View style={styles.thead}>
        <Text style={{ width: "16%" }}>Date</Text>
        <Text style={{ width: "28%" }}>Client</Text>
        <Text style={{ width: "36%" }}>Project</Text>
        <Text style={{ width: "20%", textAlign: "right" }}>Hours</Text>
      </View>
      {rows.map((r, i) => (
        <View style={styles.row} key={`h-${i}-${r.date}`} wrap={false}>
          <Text style={{ width: "16%" }}>{r.date}</Text>
          <Text style={{ width: "28%" }}>{r.clientName}</Text>
          <Text style={{ width: "36%" }}>{r.projectName}</Text>
          <Text style={{ width: "20%", textAlign: "right" }}>
            {Number.isFinite(r.hours) ? r.hours.toFixed(2) : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MileageTable({ rows }: { rows: TaxReportPayload["mileage"] }) {
  return (
    <View>
      <View style={styles.thead}>
        <Text style={{ width: "11%" }}>Date</Text>
        <Text style={{ width: "18%" }}>Project</Text>
        <Text style={{ width: "27%" }}>Route</Text>
        <Text style={{ width: "12%" }}>Trip</Text>
        <Text style={{ width: "10%"}}>km</Text>
        <Text style={{ width: "25%" }}>Notes</Text>
      </View>
      {rows.map((r, i) => (
        <View style={styles.row} key={`mi-${i}-${r.date}`} wrap={false}>
          <Text style={{ width: "11%" }}>{r.date}</Text>
          <Text style={{ width: "18%" }}>{r.projectName}</Text>
          <Text style={{ width: "27%" }}>{r.route}</Text>
          <Text style={{ width: "12%" }}>{r.tripTypeLabel}</Text>
          <Text style={{ width: "10%"}}>
            {Number.isFinite(r.distanceKm) ? r.distanceKm.toFixed(2) : "—"}
          </Text>
          <Text style={{ width: "25%" }}>{r.notes}</Text>
        </View>
      ))}
    </View>
  );
}

function CompanyTable({ rows, baseCurrency }: { rows: TaxReportPayload["companies"]; baseCurrency: string }) {
  if (!rows.length) {
    return <Text style={{ fontSize: 8, color: "#555" }}>No companies on file.</Text>;
  }
  return (
    <View>
      <View style={styles.thead}>
        <Text style={{ width: "22%" }}>Company</Text>
        <Text style={{ width: "15%", textAlign: "right" }}>Income</Text>
        <Text style={{ width: "15%", textAlign: "right" }}>Expenses</Text>
        <Text style={{ width: "15%", textAlign: "right" }}>Net</Text>
        <Text style={{ width: "12%", textAlign: "right" }}>Clients</Text>
        <Text style={{ width: "12%", textAlign: "right" }}>Projects</Text>
      </View>
      {rows.map((r, i) => (
        <View style={styles.row} key={`co-${i}-${r.companyName}`} wrap={false}>
          <Text style={{ width: "22%" }}>{r.companyName}</Text>
          <Text style={{ width: "15%", textAlign: "right" }}>{fmtMoney(r.totalIncome, baseCurrency)}</Text>
          <Text style={{ width: "15%", textAlign: "right" }}>{fmtMoney(r.totalExpenses, baseCurrency)}</Text>
          <Text style={{ width: "15%", textAlign: "right" }}>{fmtMoney(r.netProfit, baseCurrency)}</Text>
          <Text style={{ width: "12%", textAlign: "right" }}>{String(r.clientCount)}</Text>
          <Text style={{ width: "12%", textAlign: "right" }}>{String(r.projectCount)}</Text>
        </View>
      ))}
    </View>
  );
}

function ClientTable({ rows, baseCurrency }: { rows: TaxReportPayload["clients"]; baseCurrency: string }) {
  if (!rows.length) {
    return <Text style={{ fontSize: 8, color: "#555" }}>No clients on file.</Text>;
  }
  return (
    <View>
      <View style={styles.thead}>
        <Text style={{ width: "38%" }}>Client</Text>
        <Text style={{ width: "22%", textAlign: "right" }}>Income ({baseCurrency})</Text>
        <Text style={{ width: "20%", textAlign: "right" }}>Hours</Text>
        <Text style={{ width: "20%", textAlign: "right" }}>Projects</Text>
      </View>
      {rows.map((r, i) => (
        <View style={styles.row} key={`cl-${i}-${r.clientName}`} wrap={false}>
          <Text style={{ width: "38%" }}>{r.clientName}</Text>
          <Text style={{ width: "22%", textAlign: "right" }}>{fmtMoney(r.totalIncome, baseCurrency)}</Text>
          <Text style={{ width: "20%", textAlign: "right" }}>{r.totalHours.toFixed(2)}</Text>
          <Text style={{ width: "20%", textAlign: "right" }}>{String(r.projectCount)}</Text>
        </View>
      ))}
    </View>
  );
}

const INCOME_FIRST = 22;
const INCOME_REST = 22;
const EXPENSE_FIRST = 34;
const EXPENSE_REST = 34;
const HOURS_FIRST = 36;
const HOURS_REST = 36;
const CLIENT_FIRST = 32;
const CLIENT_REST = 32;
const GENERAL_EXPENSE_FIRST = 32;
const GENERAL_EXPENSE_REST = 32;
const MILEAGE_FIRST = 28;
const MILEAGE_REST = 28;

export function TaxReportDocument({ data }: { data: TaxReportPayload }) {
  const incomeChunks = chunkWithFirst(data.income, INCOME_FIRST, INCOME_REST);
  const expenseChunks = chunkWithFirst(data.expenses, EXPENSE_FIRST, EXPENSE_REST);
  const hourChunks = chunkWithFirst(data.hours, HOURS_FIRST, HOURS_REST);
  const mileageChunks = chunkWithFirst(data.mileage, MILEAGE_FIRST, MILEAGE_REST);
  const clientChunks = chunkWithFirst(data.clients, CLIENT_FIRST, CLIENT_REST);
  const generalExpenseChunks = chunkWithFirst(data.generalExpenses, GENERAL_EXPENSE_FIRST, GENERAL_EXPENSE_REST);

  const pages: React.ReactElement[] = [];

  let pageIndex = 0;
  const pushPage = (children: React.ReactNode, key: string) => {
    pageIndex += 1;
    pages.push(
      <Page key={key} size="A4" style={styles.page}>
        {children}
      </Page>
    );
  };

  /* Page 1 */
  pushPage(
    <>
      <HeaderBlock data={data} />
      <CoverOverview data={data} />
    </>,
    "p1"
  );

  // Income tables start on page 2 (first chunk is NOT "continued").
  pushPage(
    <>
      <Text style={styles.tableTitle}>Income — all transactions</Text>
      {data.income.length === 0 ? (
        <Text style={{ fontSize: 9, color: "#555" }}>No income entries in this period.</Text>
      ) : (
        <IncomeTable rows={incomeChunks[0] ?? []} />
      )}
    </>,
    "inc-0"
  );

  (incomeChunks.slice(1) ?? []).forEach((chunk, i) => {
    pushPage(
      <>
        <Text style={styles.continued}>Income (continued)</Text>
        <IncomeTable rows={chunk} />
      </>,
      `inc-${i + 1}`
    );
  });

  expenseChunks.forEach((chunk, i) => {
    pushPage(
      <>
        {i === 0 ? (
          <Text style={styles.tableTitle}>Project expenses — all transactions</Text>
        ) : (
          <Text style={styles.continued}>Expenses (continued)</Text>
        )}
        {data.expenses.length === 0 && i === 0 ? (
          <Text style={{ fontSize: 8, color: "#555" }}>No expense entries in this period.</Text>
        ) : (
          <ExpenseTable rows={chunk} />
        )}
      </>,
      `exp-${i}`
    );
  });
  
  generalExpenseChunks.forEach((chunk, i) => {
    pushPage(
      <>
        {i === 0 ? (
          <Text style={styles.tableTitle}>General expenses — all transactions</Text>
        ) : (
          <Text style={styles.continued}>General expenses (continued)</Text>
        )}
        {data.generalExpenses.length === 0 && i === 0 ? (
          <Text style={{ fontSize: 8, color: "#555" }}>
            No general expense entries in this period.
          </Text>
        ) : (
          <GeneralExpenseTable rows={chunk} />
        )}
      </>,
      `ge-${i}`
    );
  });

  hourChunks.forEach((chunk, i) => {
    pushPage(
      <>
        {i === 0 ? (
          <Text style={styles.tableTitle}>Time tracking (hours)</Text>
        ) : (
          <Text style={styles.continued}>Time tracking (continued)</Text>
        )}
        {data.hours.length === 0 && i === 0 ? (
          <Text style={{ fontSize: 8, color: "#555" }}>No hours in this period.</Text>
        ) : (
          <HoursTable rows={chunk} />
        )}
      </>,
      `hr-${i}`
    );
  });

  mileageChunks.forEach((chunk, i) => {
    pushPage(
      <>
        {i === 0 ? (
          <Text style={styles.tableTitle}>Mileage</Text>
        ) : (
          <Text style={styles.continued}>Mileage (continued)</Text>
        )}
        {data.mileage.length === 0 && i === 0 ? (
          <Text style={{ fontSize: 8, color: "#555" }}>No mileage entries in this period.</Text>
        ) : (
          <MileageTable rows={chunk} />
        )}
      </>,
      `mi-${i}`
    );
  });

  pushPage(
    <>
      <Text style={styles.tableTitle}>Company overview</Text>
      <Text style={{ fontSize: 7.5, color: "#444", marginBottom: 4 }}>
        Income and expenses are totals for clients linked to each company within the reporting period (
        {data.baseCurrency}, converted).
      </Text>
      <CompanyTable rows={data.companies} baseCurrency={data.baseCurrency} />
    </>,
    "co"
  );

  clientChunks.forEach((chunk, i) => {
    pushPage(
      <>
        {i === 0 ? (
          <Text style={styles.tableTitle}>Client overview</Text>
        ) : (
          <Text style={styles.continued}>Client overview (continued)</Text>
        )}
        <Text style={{ fontSize: 7.5, color: "#444", marginBottom: 4 }}>
          Per-client totals for the reporting period. Project count is the number of projects linked to
          the client (all projects, not filtered by date).
        </Text>
        <ClientTable rows={chunk} baseCurrency={data.baseCurrency} />
      </>,
      `cl-${i}`
    );
  });

  const totalPages = pages.length;

  return (
    <Document
      title={`Tax report — ${data.reportingPeriodLabel}`}
      author={data.businessName}
      subject="Tax / financial export"
      // Prevent ugly word-splitting hyphenation in PDFs (e.g. "ser-vices").
      // @ts-expect-error react-pdf supports this at runtime; typings may lag.
      hyphenationCallback={(word: string) => [word]}
    >
      {pages.map((el, i) => (
        <Page
          key={el.key ?? `pg-${i}`}
          size="A4"
          style={styles.page}
          wrap
        >
          {el.props.children}
          <PageFooter page={i + 1} total={totalPages} />
        </Page>
      ))}
    </Document>
  );
}
