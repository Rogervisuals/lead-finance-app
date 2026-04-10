import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const ui = getUi(getServerLocale());
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{ui.legal.privacyTitle}</h1>
      <p className="text-sm text-zinc-400">{ui.legal.privacyBody}</p>
    </div>
  );
}
