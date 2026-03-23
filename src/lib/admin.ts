/**
 * Admin access for feedback and similar features.
 *
 * If you set `ADMIN_EMAIL` in `.env`, update the Supabase RLS policy
 * `feedback_select_admin` in `supabase/schema.sql` to use the same address,
 * or the admin Feedback page will return no rows (policy blocks SELECT).
 */
const DEFAULT_ADMIN_EMAIL = "roger33354@hotmail.com";

export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? DEFAULT_ADMIN_EMAIL
  );
}

export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getAdminEmail();
}
