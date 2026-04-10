import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Preferences merged into /settings — keep route for bookmarks. */
export default function PreferencesPage() {
  redirect("/settings");
}
