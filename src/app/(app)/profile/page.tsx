import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisplayNameFromUserMetadata } from "@/lib/auth-display-name";
import { ProfileSettingsForm } from "@/components/auth/ProfileSettingsForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName = getDisplayNameFromUserMetadata(user) ?? "";
  const email = user.email ?? "";

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your account details and login credentials.
        </p>
      </div>

      <section className="mx-auto w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/20 p-5">
        <ProfileSettingsForm
          initialDisplayName={displayName}
          initialEmail={email}
        />
      </section>
    </div>
  );
}
