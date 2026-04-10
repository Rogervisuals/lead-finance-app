import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeedbackAdminRow } from "@/components/feedback/FeedbackAdminRow";
import { formatFeedbackSubmittedAt } from "@/lib/finance/format";
import { isAdminUser } from "@/lib/admin";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";

export const dynamic = "force-dynamic";

export default async function FeedbackAdminPage() {
  const ui = getUi(getServerLocale());
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdminUser(user.email)) redirect("/dashboard");

  const { data: rows, error } = await supabase
    .from("feedback")
    .select(
      "id,user_id,user_email,display_name,message,completed,created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ui.feedback.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {ui.feedback.subtitle}
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
          {ui.feedback.loadError}
        </div>
      ) : null}

      {!rows?.length ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          {ui.feedback.empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {(rows ?? []).map((r: any) => (
            <FeedbackAdminRow
              key={r.id}
              row={{
                id: r.id,
                message: r.message,
                display_name: r.display_name,
                user_email: r.user_email,
                submittedAtLabel: formatFeedbackSubmittedAt(r.created_at),
                completed: Boolean(r.completed),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
