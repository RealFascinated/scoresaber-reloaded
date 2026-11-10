import type { TimestampedData } from "@/common/server-prefetch";
import type { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import type { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const DEFAULT_LIVE_SCORES_SORT: ScoreSaberScoreSort = "recent";

/**
 * The URL params of a player's ScoreSaber scores. Shared by the client and the server so both read the URL
 * the same way.
 */
export const playerLiveScoresSearchParams = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral<ScoreSaberScoreSort>(["top", "recent"]).withDefault(DEFAULT_LIVE_SCORES_SORT),
  search: parseAsString,
  /** Selects the scores tab. The ScoreSaber tab is the default, so it is the one rendered on the server. */
  platform: parseAsString,
};

export const loadPlayerLiveScoresSearchParams = createLoader(playerLiveScoresSearchParams);

/** The parameters that decide which ScoreSaber scores of a player are requested. */
export type PlayerLiveScoresQuery = {
  page: number;
  sort: ScoreSaberScoreSort;
  search: string | undefined;
};

/** ScoreSaber scores fetched on the server, along with the query they were fetched for. */
export type PlayerLiveScoresInitialData = TimestampedData<PlayerScoresPageResponse> & {
  query: PlayerLiveScoresQuery;
};

/**
 * Builds the query for a player's ScoreSaber scores from its URL params. Searches shorter than 3 characters
 * are not sent to the backend.
 *
 * @param page the page number
 * @param sort the sort
 * @param search the search text
 */
export function buildPlayerLiveScoresQuery(
  page: number,
  sort: ScoreSaberScoreSort,
  search: string | null
): PlayerLiveScoresQuery {
  return {
    page,
    sort,
    search: search !== null && search.length >= 3 ? search : undefined,
  };
}

export function isSamePlayerLiveScoresQuery(a: PlayerLiveScoresQuery, b: PlayerLiveScoresQuery): boolean {
  return a.page === b.page && a.sort === b.sort && a.search === b.search;
}
