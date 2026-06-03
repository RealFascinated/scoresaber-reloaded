export const MIN_PLAYER_SEARCH_QUERY_LENGTH = 4;

export const PLAYER_SEARCH_TOO_SHORT_MESSAGE = "Type at least 4 characters to search.";

export function isPlayerSearchQueryTooShort(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length > 0 && trimmed.length < MIN_PLAYER_SEARCH_QUERY_LENGTH;
}
