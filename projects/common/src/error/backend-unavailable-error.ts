/**
 * Default message shown when the backend cannot be reached.
 */
export const BACKEND_UNAVAILABLE_MESSAGE =
  "The backend is currently offline or unreachable. Please try again later.";

/**
 * Thrown by the SSR API client when the backend is not serving valid responses:
 * unreachable (connection refused, DNS, timeout), failing with a 5xx, or
 * answering with a non-API payload (e.g. a proxy error page).
 *
 * This is intentionally distinct from a genuine "not found" (which the API
 * client reports as `undefined`), so pages can show a real error instead of a
 * misleading "player/leaderboard not found" state.
 */
export class BackendUnavailableError extends Error {
  /**
   * Marker used for type checks instead of `instanceof`: bundlers can create
   * duplicate module instances for the same file (e.g. the common package's
   * relative imports vs. the website's package-specifier imports in dev), which
   * would make `instanceof` silently fail. The plain property survives that.
   */
  readonly isBackendUnavailableError = true as const;

  constructor(message: string = BACKEND_UNAVAILABLE_MESSAGE, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BackendUnavailableError";
  }
}
