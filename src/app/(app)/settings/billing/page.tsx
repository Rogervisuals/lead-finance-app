import { redirect } from "next/navigation";

/**
 * Billing UI lives on /settings under the "Billing & subscription" section.
 * Old links to this route still work.
 */
export default function SettingsBillingRedirectPage() {
  redirect("/settings#settings-billing");
}
