import { getServerLocale } from "@/lib/i18n/server";
import { getUi } from "@/lib/i18n/get-ui";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const ui = getUi(getServerLocale());
  return <LoginForm copy={ui.auth} />;
}
