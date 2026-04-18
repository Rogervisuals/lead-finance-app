import { CurrencyWithUsd } from "@/components/display/CurrencyWithUsd";
import { TrashIcon } from "@/components/icons/LabeledIcons";
import {
  createIncomeFromTemplateAction,
  deleteIncomeTemplateAction,
} from "@/app/(app)/server-actions/income";

type Template = {
  id: string;
  client_id: string;
  project_id: string | null;
  amount: number | string | null;
};

export async function IncomeQuickTemplateButtons({
  templates,
  clientById,
  projectById,
  baseCurrency,
}: {
  templates: Template[];
  clientById: Map<string, string>;
  projectById: Map<string, string>;
  baseCurrency: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <IncomeQuickTemplateButton
          key={t.id}
          template={t}
          clientById={clientById}
          projectById={projectById}
          baseCurrency={baseCurrency}
        />
      ))}
    </div>
  );
}

async function IncomeQuickTemplateButton({
  template: t,
  clientById,
  projectById,
  baseCurrency,
}: {
  template: Template;
  clientById: Map<string, string>;
  projectById: Map<string, string>;
  baseCurrency: string;
}) {
  const clientName = clientById.get(t.client_id) ?? "Client";
  const projectName = t.project_id
    ? projectById.get(t.project_id)
    : null;
  const labelPrefix = projectName
    ? `${clientName} / ${projectName}`
    : clientName;

  return (
    <div className="relative inline-flex max-w-full items-stretch">
      <form action={createIncomeFromTemplateAction}>
        <input type="hidden" name="template_id" value={t.id} />
        <button
          type="submit"
          className="rounded-md border border-zinc-800 bg-zinc-950/30 py-1.5 pl-3 pr-8 text-left text-xs text-zinc-200 hover:bg-zinc-950/50"
        >
          <span className="block text-zinc-300">{labelPrefix}</span>
          <CurrencyWithUsd
            amount={Number(t.amount ?? 0)}
            currency={baseCurrency}
            primaryClassName="font-medium text-zinc-100"
            usdClassName="mt-0.5 text-[10px] text-zinc-500"
          />
        </button>
      </form>
      <form
        action={deleteIncomeTemplateAction}
        className="absolute right-0 top-0"
      >
        <input type="hidden" name="template_id" value={t.id} />
        <button
          type="submit"
          title="Remove template"
          aria-label="Remove template"
          className="flex h-6 w-6 items-center justify-center rounded-tr-md text-sm leading-none text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
