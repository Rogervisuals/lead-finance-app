import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeedbackSubmitForm } from "@/components/feedback/FeedbackSubmitForm";
import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";

export const dynamic = "force-dynamic";

export default async function FeedbackSubmitPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ui = getUi(getServerLocale());
  const f = ui.feedback;

  return (
    <div className="mx-auto min-w-0 max-w-lg space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-sky-400 hover:text-sky-300 hover:underline"
        >
          ← {ui.common.back}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-100">{f.submitTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.submitSubtitle}</p>
      </div>
      <FeedbackSubmitForm
        copy={{
          messagePlaceholder: f.messagePlaceholder,
          submitButton: f.submitButton,
          sending: f.sending,
          successTitle: f.successTitle,
          successBody: f.successBody,
          returnToDashboard: f.returnToDashboard,
          sendAnother: f.sendAnother,
        }}
      />
    </div>
  );
}
