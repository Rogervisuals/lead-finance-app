import { canUseInvoiceFeatures } from "@/lib/permissions";

export type GettingStartedItem = {
  id: string;
  completed: boolean;
  href: string;
  /** True when invoice row is shown but plan does not include invoices (Pro). */
  locked: boolean;
};

export type GettingStartedState = {
  items: GettingStartedItem[];
  progressDone: number;
  progressTotal: number;
  allDone: boolean;
};

type UserSettingsRow = {
  financial_settings_saved_at: string | null;
  business_name: string | null;
  invoice_logo_path: string | null;
} | null;

/**
 * Derives onboarding checklist completion from settings + aggregate counts.
 * Base currency / VAT / tax complete after the user has saved financial settings at least once
 * (`financial_settings_saved_at`).
 */
export function buildGettingStartedState(
  plan: string,
  row: UserSettingsRow,
  counts: {
    clients: number;
    projects: number;
    income: number;
    expenses: number;
  },
): GettingStartedState {
  const invoiceFeatures = canUseInvoiceFeatures(plan);

  const financialSaved = Boolean(row?.financial_settings_saved_at);
  const baseDone = financialSaved;
  const vatDone = financialSaved;
  const taxDone = financialSaved;

  const clientDone = counts.clients >= 1;
  const projectDone = counts.projects >= 1;
  const incomeDone = counts.income >= 1;
  const expenseDone = counts.expenses >= 1;

  const invoiceSetupDone =
    invoiceFeatures &&
    (Boolean(String(row?.business_name ?? "").trim()) ||
      Boolean(String(row?.invoice_logo_path ?? "").trim()));

  const core: GettingStartedItem[] = [
    {
      id: "baseCurrency",
      completed: baseDone,
      href: "/settings#settings-financial",
      locked: false,
    },
    {
      id: "vat",
      completed: vatDone,
      href: "/settings#settings-financial",
      locked: false,
    },
    {
      id: "tax",
      completed: taxDone,
      href: "/settings#settings-financial",
      locked: false,
    },
    {
      id: "client",
      completed: clientDone,
      href: "/clients",
      locked: false,
    },
    {
      id: "project",
      completed: projectDone,
      href: "/projects",
      locked: false,
    },
    {
      id: "income",
      completed: incomeDone,
      href: "/income",
      locked: false,
    },
    {
      id: "expense",
      completed: expenseDone,
      href: "/expenses",
      locked: false,
    },
  ];

  const invoiceItem: GettingStartedItem = invoiceFeatures
    ? {
        id: "invoice",
        completed: invoiceSetupDone,
        href: "/settings#settings-invoice",
        locked: false,
      }
    : {
        id: "invoice",
        completed: false,
        href: "/settings#settings-billing",
        locked: true,
      };

  const items = [...core, invoiceItem];

  const countable = items.filter((i) => !i.locked);
  const progressDone = countable.filter((i) => i.completed).length;
  const progressTotal = countable.length;
  const allDone =
    progressTotal > 0 && progressDone === progressTotal;

  return { items, progressDone, progressTotal, allDone };
}
