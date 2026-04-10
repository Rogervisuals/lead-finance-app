import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  const ui = getUi(getServerLocale());
  return <SignupForm copy={ui.auth} />;
}
