import type { TimestampedData } from "@/common/server-prefetch";
import type { PlayerRankingsResponse } from "@ssr/common/schemas/response/player/player-rankings";
import { createLoader, parseAsBoolean, parseAsInteger, parseAsString } from "nuqs/server";

/** Searches shorter than this are ignored, matching the backend search. */
const MIN_SEARCH_LENGTH = 3;

/**
 * The URL params of the ranking page. Shared by the client and the server so both read the URL the same way.
 */
export const rankingSearchParams = {
  page: parseAsInteger.withDefault(1),
  country: parseAsString,
  search: parseAsString.withDefault(""),
  inactive: parseAsBoolean.withDefault(false),
  relativePp: parseAsBoolean.withDefault(false),
};

export const loadRankingSearchParams = createLoader(rankingSearchParams);

/** The parameters that decide which players the ranking page requests. */
export type RankingQuery = {
  page: number;
  country: string | undefined;
  search: string | undefined;
  includeInactives: boolean;
};

/** Ranking data fetched on the server, along with the query it was fetched for. */
export type RankingInitialData = TimestampedData<PlayerRankingsResponse> & {
  query: RankingQuery;
};

/**
 * Builds the query for the ranking page from its URL params.
 *
 * @param page the page number
 * @param country the country filter
 * @param search the (debounced) search text
 * @param includeInactives whether inactive players are included
 */
export function buildRankingQuery(
  page: number,
  country: string | null,
  search: string,
  includeInactives: boolean
): RankingQuery {
  return {
    page,
    country: country?.toUpperCase() ?? undefined,
    search: search.length >= MIN_SEARCH_LENGTH ? search : undefined,
    includeInactives,
  };
}

export function isSameRankingQuery(a: RankingQuery, b: RankingQuery): boolean {
  return (
    a.page === b.page &&
    a.country === b.country &&
    a.search === b.search &&
    a.includeInactives === b.includeInactives
  );
}
