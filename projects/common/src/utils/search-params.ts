/**
 * Builds a search params string from a record of key-value pairs.
 *
 * @param params the record of key-value pairs to build the search params from.
 * @returns the search params string.
 */
export function buildSearchParams(
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}
