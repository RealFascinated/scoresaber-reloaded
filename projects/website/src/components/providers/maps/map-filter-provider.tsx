"use client";

import {
  ScoreSaberLeaderboardSearchCategory,
  ScoreSaberLeaderboardSearchCategorySchema,
  ScoreSaberLeaderboardSearchSort,
  ScoreSaberLeaderboardSearchSortSchema,
} from "@ssr/common/schemas/scoresaber/leaderboard/search-filters";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { parseAsBoolean, parseAsFloat, parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { createContext, ReactNode, useContext } from "react";

const defaultCategory: ScoreSaberLeaderboardSearchCategory = "date_ranked";
const defaultSort: ScoreSaberLeaderboardSearchSort = "desc";

type FilterContextProps = {
  category: ScoreSaberLeaderboardSearchCategory;
  sort: ScoreSaberLeaderboardSearchSort;
  starMin: number;
  starMax: number;
  search: string;
  setSearch: (search: string) => void;
  setCategory: (category: ScoreSaberLeaderboardSearchCategory) => void;
  setSort: (sort: ScoreSaberLeaderboardSearchSort) => void;
  setStarMin: (starMin: number) => void;
  setStarMax: (starMax: number) => void;

  ranked: boolean;
  qualified: boolean;
  setRanked: (ranked: boolean) => void;
  setQualified: (qualified: boolean) => void;

  clearFilters: () => void;
  hasFiltersApplied: () => boolean;
};
const MapFilterContext = createContext<FilterContextProps | undefined>(undefined);

export const MapFilterProvider = ({ children }: { children: ReactNode }) => {
  const [category, setCategory] = useQueryState<ScoreSaberLeaderboardSearchCategory>(
    "category",
    parseAsStringLiteral(ScoreSaberLeaderboardSearchCategorySchema.options).withDefault(defaultCategory)
  );
  const [sort, setSort] = useQueryState<ScoreSaberLeaderboardSearchSort>(
    "sort",
    parseAsStringLiteral(ScoreSaberLeaderboardSearchSortSchema.options).withDefault(defaultSort)
  );
  const [starMin, setStarMin] = useQueryState("starMin", parseAsFloat.withDefault(0));
  const [starMax, setStarMax] = useQueryState("starMax", parseAsFloat.withDefault(SHARED_CONSTS.maxStars));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [ranked, setRanked] = useQueryState("ranked", parseAsBoolean.withDefault(false));
  const [qualified, setQualified] = useQueryState("qualified", parseAsBoolean.withDefault(false));

  const clearFilters = () => {
    setCategory(defaultCategory);
    setSort(defaultSort);
    setStarMin(0);
    setStarMax(SHARED_CONSTS.maxStars);
    setSearch("");
    setRanked(false);
    setQualified(false);
  };

  const hasFiltersApplied = () => {
    return (
      category !== defaultCategory ||
      sort !== defaultSort ||
      starMin !== 0 ||
      starMax !== SHARED_CONSTS.maxStars ||
      ranked ||
      qualified ||
      search !== ""
    );
  };

  return (
    <MapFilterContext.Provider
      value={{
        category,
        sort,
        starMin,
        starMax,
        search,
        setSearch,
        setCategory,
        setSort,
        setStarMin,
        setStarMax,
        ranked,
        qualified,
        setRanked,
        setQualified,
        clearFilters,
        hasFiltersApplied,
      }}
    >
      {children}
    </MapFilterContext.Provider>
  );
};

/**
 * Use the map filter context.
 */
export const useMapFilter = (): FilterContextProps => {
  const context = useContext(MapFilterContext);
  if (!context) {
    throw new Error("useLeaderboardFilter must be used within a LeaderboardFilterProvider");
  }
  return context;
};
