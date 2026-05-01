/** Central limits for the AI assistant (rate, input, abuse). */

export const MIN_REQUEST_INTERVAL_MS = 2000;
export const MAX_REQUESTS_PER_MINUTE_USER = 10;
export const MAX_REQUESTS_PER_MINUTE_IP = 40;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export const MAX_AI_INPUT_CHARS = 300;
export const MAX_AI_INPUT_WORDS = 45;

/** More than this many completed requests in the sliding window → mark for future CAPTCHA. */
export const CAPTCHA_THRESHOLD_IN_WINDOW = 8;

export const ABUSE_STRIKES_TO_FLAG = 5;

export const FLAGGED_REQUEST_DELAY_MIN_MS = 3000;
export const FLAGGED_REQUEST_DELAY_MAX_MS = 5000;
