import type { TimestampedData } from "@/common/server-prefetch";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { Pagination } from "@ssr/common/pagination";
import type { LeaderboardScoresResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard-scores";
import type { ScoreSaberScoresPageResponse } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";

/**
 * The URL params of a leaderboard's scores. Shared by the client and the server so both read the URL the same way.
 */
export const leaderboardScoresSearchParams = {
  page: parseAsInteger.withDefault(1),
  mode: parseAsStringLiteral<ScoreModeEnum>(Object.values(ScoreModeEnum)).withDefault(ScoreModeEnum.Global),
  country: parseAsString,
};

export const loadLeaderboardScoresSearchParams = createLoader(leaderboardScoresSearchParams);

/** The parameters that decide which global scores of a leaderboard are requested. */
export type LeaderboardScoresQuery = {
  leaderboardId: number;
  page: number;
  country: string | undefined;
};

/** Global leaderboard scores fetched on the server, along with the query they were fetched for. */
export type LeaderboardScoresInitialData = TimestampedData<ScoreSaberScoresPageResponse> & {
  query: LeaderboardScoresQuery;
};

export function isSameLeaderboardScoresQuery(a: LeaderboardScoresQuery, b: LeaderboardScoresQuery): boolean {
  return a.leaderboardId === b.leaderboardId && a.page === b.page && a.country === b.country;
}

/**
 * Converts the global scores response of a leaderboard to a page of scores.
 *
 * @param response the response, undefined when the leaderboard has no scores page
 */
export function toLeaderboardScoresPage(
  response: LeaderboardScoresResponse | undefined
): ScoreSaberScoresPageResponse {
  if (response) {
    return {
      items: response.scores,
      metadata: response.metadata,
    };
  }

  return Pagination.empty();
}
