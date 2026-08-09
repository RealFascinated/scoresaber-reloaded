/**
 * Returns true when a query error means the SSR backend is offline/unreachable
 * (as opposed to a genuine "not found" or another client error).
 *
 * Checks a marker property instead of `instanceof`: bundlers can create
 * duplicate module instances for the same source file (the common package's
 * relative imports vs. the website's package-specifier imports), which would
 * make `instanceof` silently fail. `Error` itself is a global, so that part of
 * the check is safe.
 */
export function isBackendUnavailableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as { isBackendUnavailableError?: unknown }).isBackendUnavailableError === true
  );
}
