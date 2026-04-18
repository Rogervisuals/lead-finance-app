/** Users who should not see the "Send feedback" nav link (desktop + mobile). */
const HIDE_SEND_FEEDBACK_USER_IDS = new Set([
  "7b68ae70-5d27-4ed8-bbbb-9120c38ab569",
]);

const HIDE_SEND_FEEDBACK_DISPLAY_NAMES_LOWER = new Set(["roger noordover"]);

export function showSendFeedbackNavLink(
  userId: string,
  navbarDisplayLabel: string,
): boolean {
  if (HIDE_SEND_FEEDBACK_USER_IDS.has(userId)) return false;
  const normalized = navbarDisplayLabel.trim().toLowerCase();
  if (normalized && HIDE_SEND_FEEDBACK_DISPLAY_NAMES_LOWER.has(normalized)) {
    return false;
  }
  return true;
}
