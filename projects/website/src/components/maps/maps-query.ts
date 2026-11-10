import type { TimestampedData } from "@/common/server-prefetch";
import type { LeaderboardsPageResponse } from "@ssr/common/schemas/response/leaderboard/leaderboards-page";
import {
  ScoreSaberLeaderboardQueryCategory,
  ScoreSaberLeaderboardQueryCategorySchema,
  ScoreSaberLeaderboardQuerySort,
  ScoreSaberLeaderboardQuerySortSchema,
} from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import {
  createLoader,
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const DEFAULT_MAP_CATEGORY: ScoreSaberLeaderboardQueryCategory = "trending";
export const DEFAULT_MAP_SORT: ScoreSaberLeaderboardQuerySort = "desc";

/**
 * The URL params that filter the maps. Shared by the client and the server so both read the URL the same way.
 */
export const mapFilterParsers = {
  category: parseAsStringLiteral<ScoreSaberLeaderboardQueryCategory>(
    ScoreSaberLeaderboardQueryCategorySchema.anyOf.map(option => option.const)
  ).withDefault(DEFAULT_MAP_CATEGORY),
  sort: parseAsStringLiteral<ScoreSaberLeaderboardQuerySort>(
    ScoreSaberLeaderboardQuerySortSchema.anyOf.map(option => option.const)
  ).withDefault(DEFAULT_MAP_SORT),
  starMin: parseAsFloat.withDefault(0),
  starMax: parseAsFloat.withDefault(SHARED_CONSTS.maxStars),
  search: parseAsString.withDefault(""),
  ranked: parseAsBoolean.withDefault(false),
  qualified: parseAsBoolean.withDefault(false),
};

export const mapsSearchParams = {
  page: parseAsInteger.withDefault(1),
  ...mapFilterParsers,
};

export const loadMapsSearchParams = createLoader(mapsSearchParams);

/** The filter values that decide which maps are requested. */
export type MapFilterValues = {
  category: ScoreSaberLeaderboardQueryCategory;
  sort: ScoreSaberLeaderboardQuerySort;
  starMin: number;
  starMax: number;
  search: string;
  ranked: boolean;
  qualified: boolean;
};

/** The parameters that decide which maps the leaderboards page requests. */
export type MapsQuery = {
  page: number;
  category: ScoreSaberLeaderboardQueryCategory;
  sort: ScoreSaberLeaderboardQuerySort;
  minStars: number;
  maxStars: number;
  ranked: boolean;
  qualified: boolean;
  query: string | undefined;
};

/** Maps fetched on the server, along with the query they were fetched for. */
export type MapsInitialData = TimestampedData<LeaderboardsPageResponse> & {
  query: MapsQuery;
};

/**
 * Builds the query for the leaderboards page from its page and filter values.
 *
 * @param page the page number
 * @param filter the (debounced) filter values
 */
export function buildMapsQuery(page: number, filter: MapFilterValues): MapsQuery {
  return {
    page,
    category: filter.category,
    sort: filter.sort,
    minStars: filter.starMin,
    maxStars: filter.starMax,
    ranked: filter.ranked,
    qualified: filter.qualified,
    query: filter.search.length > 3 ? filter.search : undefined,
  };
}

export function isSameMapsQuery(a: MapsQuery, b: MapsQuery): boolean {
  return (
    a.page === b.page &&
    a.category === b.category &&
    a.sort === b.sort &&
    a.minStars === b.minStars &&
    a.maxStars === b.maxStars &&
    a.ranked === b.ranked &&
    a.qualified === b.qualified &&
    a.query === b.query
  );
}
