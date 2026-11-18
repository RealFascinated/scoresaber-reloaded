const BACKOFF_BASE_MS = 500;
const BACKOFF_MAX_MS = 10_000;
const RETRY_AFTER_MAX_MS = 30_000;

/**
 * Reads the `Retry-After` header of a response (seconds or an HTTP date), capped to a sane maximum.
 *
 * @param response the response to read
 * @returns the delay in ms, or undefined when the header is missing or unparseable
 */
export function parseRetryAfterMs(response: Response) {
  const header = response.headers.get("retry-after");
  if (!header) {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.min(seconds * 1000, RETRY_AFTER_MAX_MS));
  }
  const date = new Date(header).getTime();
  return Number.isFinite(date) ? Math.max(0, Math.min(date - Date.now(), RETRY_AFTER_MAX_MS)) : undefined;
}

/**
 * Waits before the next attempt of a request: the server's `Retry-After` when given, otherwise
 * exponential backoff with jitter.
 *
 * @param attempt the attempt that just failed, starting at 1
 * @param retryAfterMs the delay the server asked for, if any
 */
export async function backoff(attempt: number, retryAfterMs?: number) {
  if (retryAfterMs != null) {
    await new Promise(resolve => setTimeout(resolve, retryAfterMs));
    return;
  }
  const exponentialMs = Math.min(BACKOFF_BASE_MS * 2 ** (attempt - 1), BACKOFF_MAX_MS);
  const delayMs = exponentialMs / 2 + Math.random() * (exponentialMs / 2);
  await new Promise(resolve => setTimeout(resolve, delayMs));
}
