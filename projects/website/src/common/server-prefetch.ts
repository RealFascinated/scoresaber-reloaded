import { isBackendUnavailableError } from "@/common/api-error";

/** How long a server render waits for the backend before falling back to client-side fetching. */
const PREFETCH_TIMEOUT_MS = 3000;

/**
 * Prefetches data on the server so it is part of the initial HTML.
 *
 * Prefetching is only an optimisation: when the backend is slow, unreachable or the request fails,
 * this resolves to undefined and the client fetches the data itself, exactly as it did before.
 *
 * @param request the request to run
 * @param timeoutMs how long to wait before giving up
 */
export async function prefetchInitialData<T>(
  request: Promise<T | undefined>,
  timeoutMs: number = PREFETCH_TIMEOUT_MS
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>(resolve => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });

  try {
    return await Promise.race([request, timeout]);
  } catch (error) {
    if (!isBackendUnavailableError(error)) {
      console.error("Failed to prefetch data on the server, falling back to the client:", error);
    }
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Data fetched on the server, and when it was fetched. */
export type TimestampedData<T> = {
  data: T;
  /** Unix timestamp in milliseconds. */
  fetchedAt: number;
};

/**
 * Prefetches data like {@link prefetchInitialData}, and records when it was fetched.
 *
 * The client seeds its queries with this timestamp so data that has since gone stale (a long lived page,
 * or a cached render) is refetched instead of being treated as fresh.
 *
 * @param request the request to run
 */
export async function prefetchTimestampedData<T>(
  request: Promise<T | undefined>
): Promise<TimestampedData<T> | undefined> {
  const data = await prefetchInitialData(request);
  return data === undefined ? undefined : { data, fetchedAt: Date.now() };
}
