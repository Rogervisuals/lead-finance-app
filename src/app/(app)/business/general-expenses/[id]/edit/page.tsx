import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteBusinessExpenseAction,
  updateBusinessExpenseAction,
} from "../../../../server-actions/business-expenses";

export const dynamic = "force-dynamic";

export default async function EditBusinessExpensePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: expense } = await supabase
    .from("business_expenses")
    .select("id,amount,date,category,notes")
    .eq("user_id", user.id)
    .eq("id", params.id)
    .single();

  if (!expense) redirect("/business/general-expenses");

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit expense</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <Link href="/business/general-expenses" className="hover:underline">
            Back
          </Link>
        </p>
      </div>

      <section className="min-w-0 overflow-x-clip rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <form
          action={updateBusinessExpenseAction}
          className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 [&>label]:min-w-0 [&>div]:min-w-0"
        >
          <input type="hidden" name="id" value={expense.id} />

          <label className="min-w-0 space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Amount *</span>
            <input
              required
              name="amount"
              type="number"
              step="0.01"
              defaultValue={expense.amount ?? 0}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="block min-w-0 max-w-full space-y-1 overflow-hidden">
            <span className="text-sm text-zinc-300">Date *</span>
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 [color-scheme:dark]">
              <input
                required
                name="date"
                type="date"
                defaultValue={expense.date ?? ""}
                className="block w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-sm text-zinc-100 outline-none focus:ring-0"
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-zinc-300">Category *</span>
            <select
              required
              name="category"
              defaultValue={expense.category ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="Online services">Online services</option>
              <option value="Transport">Transport</option>
              <option value="events">events</option>
            </select>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Notes</span>
            <input
              name="notes"
              defaultValue={expense.notes ?? ""}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Save changes
            </button>
          </div>
        </form>

        <form action={deleteBusinessExpenseAction} className="mt-4">
          <input type="hidden" name="id" value={expense.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/40"
          >
            Delete expense
          </button>
        </form>
      </section>
    </div>
  );
}

