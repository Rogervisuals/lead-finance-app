import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { TaxReportPayload } from "./fetch-tax-report-data";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#111",
  },
  docTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  meta: { fontSize: 8.5, color: "#333", marginBottom: 2 },
  note: {
    fontSize: 7.5,
    color: "#555",
    marginTop: 10,
    marginBottom: 6,
    lineHeight: 1.35,
  },
  h2: {
    fontSize: 10,
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
  return (
    <View>
      <Text style={styles.docTitle}>Tax report — financial export</Text>
      <Text style={styles.meta}>Business / user: {data.businessName}</Text>
      <Text style={styles.meta}>Reporting period: {data.reportingPeriodLabel}</Text>
      <Text style={styles.meta}>Export generated: {data.exportDateLabel}</Text>
      <Text style={styles.note}>
        Amounts in the summary below use your base accounting currency ({data.baseCurrency}
        ) where noted. Transaction tables list original amounts and currencies per entry.
      </Text>
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
      <SummaryBlock data={data} />
      <Text style={styles.tableTitle}>Income — all transactions</Text>
      {data.income.length === 0 ? (
        <Text style={{ fontSize: 8, color: "#555" }}>No income entries in this period.</Text>
      ) : (
        <IncomeTable rows={incomeChunks[0] ?? []} />
      )}
    </>,
    "p1"
  );

  (incomeChunks.slice(1) ?? []).forEach((chunk, i) => {
    pushPage(
      <>
        <Text style={styles.continued}>Income (continued)</Text>
        <IncomeTable rows={chunk} />
      </>,
      `inc-${i}`
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
