import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef } from "react";

// Module-level cache that persists across component remounts
// Uses a Map keyed by cache key string
const queryCache = new Map<string, unknown>();

let queryCounter = 0;

/**
 * Generates a stable cache key from the querier function
 */
function getStableCacheKey(querier: () => unknown, deps?: unknown[]): string {
  // Try to extract a stable identifier from the function
  const funcStr = querier.toString();
  // Extract the method name if it's a method call like "database.getMainPlayerId"
  // This regex matches patterns like: database.getMainPlayerId() or obj.method()
  const methodMatch = funcStr.match(/(?:return\s+)?\w+\.(\w+)\s*\(/);
  const methodName = methodMatch ? methodMatch[1] : `query${++queryCounter}`;
  const depsStr = deps && deps.length > 0 ? `:${JSON.stringify(deps)}` : "";
  return `${methodName}${depsStr}`;
}

/**
 * A wrapper around useLiveQuery that maintains the previous value
 * when the query temporarily returns undefined during component remounts.
 *
 * This is useful in Next.js where page transitions cause components to remount,
 * and useLiveQuery briefly returns undefined even though the data exists.
 *
 * @param querier - The query function to execute
 * @param deps - Optional dependency array for the query function
 * @returns The query result, or the previous value if the current result is undefined
 */
export function useStableLiveQuery<T>(
  querier: () => T | Promise<T> | undefined,
  deps?: unknown[]
): T | undefined {
  // Generate a stable cache key for this query
  const cacheKey = useMemo(() => getStableCacheKey(querier, deps), [querier, deps]);
  
  // Memoize the safe querier to ensure stable reference for useLiveQuery deduplication
  // useLiveQuery deduplicates based on the function reference and deps
  const safeQuerier = useMemo(() => {
    return () => {
      try {
        return querier();
      } catch {
        // If querier throws (e.g., database is undefined), return undefined
        return undefined;
      }
    };
  }, [querier]);

  // useLiveQuery will deduplicate calls with the same function reference and deps
  // Multiple components using the same query will share the same database call
  const result = useLiveQuery(safeQuerier, deps);
  
  // Use a ref to track the last value for comparison and caching
  const lastValueRef = useRef<T | undefined>(queryCache.get(cacheKey) as T | undefined);
  const resultRef = useRef(result);
  
  // Update cache when result changes
  useEffect(() => {
    resultRef.current = result;
    if (result !== undefined) {
      lastValueRef.current = result;
      queryCache.set(cacheKey, result);
    }
  }, [result, cacheKey]);

  // Always return result directly when defined - this ensures useLiveQuery's reactivity works
  // Only use cached value as fallback when result is undefined (during remounts)
  if (result !== undefined) {
    return result;
  }
  
  // Fallback to cached value during remounts
  return lastValueRef.current;
}

