/**
 * AI assistant guard helpers used by `POST /api/ai-create-client`.
 *
 * Intended order: {@link validateAiAssistantInput} → auth → {@link checkRateLimits} →
 * DB cooldown (`last_request_at`) → {@link updateRateLimits} → {@link handleAIRequest}.
 * In-memory sliding windows live in `rate-limit-store.ts`; swap for Redis when scaling.
 */

export { validateAiAssistantInput } from "./validate-ai-input";
export {
  checkRateLimits,
  getRequiresCaptchaAfterRequest,
  updateRateLimits,
} from "./rate-limit-store";
export { handleAIRequest } from "./handle-ai-request";
