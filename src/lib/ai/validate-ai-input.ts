import { MAX_AI_INPUT_CHARS, MAX_AI_INPUT_WORDS } from "@/lib/ai/assistant-limits";

const INPUT_TOO_LONG = "Input too long. Please keep it short.";
const MSG_REQUIRED = "Message is required.";

export type ValidateAiInputResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

function wordCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Server-side assistant input: trim, max words, max characters.
 */
export function validateAiAssistantInput(raw: unknown): ValidateAiInputResult {
  if (typeof raw !== "string") {
    return { ok: false, error: MSG_REQUIRED };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: MSG_REQUIRED };
  }
  if (trimmed.length > MAX_AI_INPUT_CHARS) {
    return { ok: false, error: INPUT_TOO_LONG };
  }
  if (wordCount(trimmed) > MAX_AI_INPUT_WORDS) {
    return { ok: false, error: INPUT_TOO_LONG };
  }
  return { ok: true, value: trimmed };
}
