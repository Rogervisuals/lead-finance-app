"use server";

import {
  getDisplayNameFromUserMetadata,
  getNavbarDisplayLabel,
} from "@/lib/auth-display-name";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

export type SubmitFeedbackState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function submitFeedbackAction(
  formData: FormData,
): Promise<SubmitFeedbackState> {
  const raw = String(formData.get("message") ?? "").trim();
  if (!raw) {
    return { ok: false, error: "Please enter a message." };
  }
  if (raw.length > 20_000) {
    return { ok: false, error: "Message is too long." };
  }

  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const displayName =
    getDisplayNameFromUserMetadata(user) ?? getNavbarDisplayLabel(user);

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    user_email: user.email ?? null,
    display_name: displayName,
    message: raw,
  });

  if (error) {
    console.error("feedback insert:", error);
    return { ok: false, error: "Could not send feedback. Try again later." };
  }

  return { ok: true, message: "Thanks for your feedback!" };
}
