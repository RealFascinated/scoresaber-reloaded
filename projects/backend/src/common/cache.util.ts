import {SSRCache} from "@ssr/common/cache";
import {InternalServerError} from "@ssr/common/error/internal-server-error";
import {isProduction} from "@ssr/common/utils/utils";

/**
 * Fetches data with caching.
 *
 * @param cache the cache to fetch from
 * @param cacheKey The key used for caching.
 * @param fetchFn The function to fetch data if it's not in cache.
 */
export async function fetchWithCache<T>(cache: SSRCache, cacheKey: string, fetchFn: () => Promise<T>): Promise<T> {
  if (!isProduction()) {
    return fetchFn();
  }

  if (cache == undefined) {
    throw new InternalServerError(`Cache is not defined`);
  }

  if (cache.has(cacheKey)) {
    return cache.get<T>(cacheKey)!;
  }

  const data = await fetchFn();
  if (data) {
    cache.set(cacheKey, data);
  }

  return data;
}
