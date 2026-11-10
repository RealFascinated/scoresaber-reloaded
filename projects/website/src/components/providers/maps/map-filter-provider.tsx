"use client";

import { DEFAULT_MAP_CATEGORY, DEFAULT_MAP_SORT, mapFilterParsers } from "@/components/maps/maps-query";
import {
  ScoreSaberLeaderboardQueryCategory,
  ScoreSaberLeaderboardQuerySort,
} from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { useQueryState } from "nuqs";
import { createContext, ReactNode, useContext } from "react";

const defaultCategory = DEFAULT_MAP_CATEGORY;
const defaultSort = DEFAULT_MAP_SORT;

type FilterContextProps = {
  category: ScoreSaberLeaderboardQueryCategory;
  sort: ScoreSaberLeaderboardQuerySort;
  starMin: number;
  starMax: number;
  search: string;
  setSearch: (search: string) => void;
  setCategory: (category: ScoreSaberLeaderboardQueryCategory) => void;
  setSort: (sort: ScoreSaberLeaderboardQuerySort) => void;
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
  const [category, setCategory] = useQueryState("category", mapFilterParsers.category);
  const [sort, setSort] = useQueryState("sort", mapFilterParsers.sort);
  const [starMin, setStarMin] = useQueryState("starMin", mapFilterParsers.starMin);
  const [starMax, setStarMax] = useQueryState("starMax", mapFilterParsers.starMax);
  const [search, setSearch] = useQueryState("search", mapFilterParsers.search);
  const [ranked, setRanked] = useQueryState("ranked", mapFilterParsers.ranked);
  const [qualified, setQualified] = useQueryState("qualified", mapFilterParsers.qualified);

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

export const useMapFilter = (): FilterContextProps => {
  const context = useContext(MapFilterContext);
  if (!context) {
    throw new Error("useLeaderboardFilter must be used within a LeaderboardFilterProvider");
  }
  return context;
};
