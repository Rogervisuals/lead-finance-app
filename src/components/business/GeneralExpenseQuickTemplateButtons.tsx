import { CurrencyWithUsd } from "@/components/display/CurrencyWithUsd";
import { TrashIcon } from "@/components/icons/LabeledIcons";
import {
  createGeneralExpenseFromTemplateAction,
  deleteGeneralExpenseTemplateAction,
} from "@/app/(app)/server-actions/business-expenses";

type Template = {
  id: string;
  amount: number | string | null;
  notes: string | null;
};

export async function GeneralExpenseQuickTemplateButtons({
  templates,
  baseCurrency,
}: {
  templates: Template[];
  baseCurrency: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <GeneralExpenseQuickTemplateButton
          key={t.id}
          template={t}
          baseCurrency={baseCurrency}
        />
      ))}
    </div>
  );
}

async function GeneralExpenseQuickTemplateButton({
  template: t,
  baseCurrency,
}: {
  template: Template;
  baseCurrency: string;
}) {
  const labelNotes = (t.notes ?? "").trim();

  return (
    <div className="relative inline-flex max-w-full items-stretch">
      <form action={createGeneralExpenseFromTemplateAction}>
        <input type="hidden" name="template_id" value={t.id} />
        <button
          type="submit"
          className="rounded-md border border-zinc-800 bg-zinc-950/30 py-1.5 pl-3 pr-8 text-left text-xs text-zinc-200 hover:bg-zinc-950/50"
        >
          {labelNotes ? (
            <span className="mb-0.5 block text-zinc-400">{labelNotes}</span>
          ) : null}
          <CurrencyWithUsd
            amount={Number(t.amount ?? 0)}
            currency={baseCurrency}
            primaryClassName="font-medium text-zinc-100"
            usdClassName="mt-0.5 text-[10px] text-zinc-500"
          />
        </button>
      </form>
      <form
        action={deleteGeneralExpenseTemplateAction}
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
