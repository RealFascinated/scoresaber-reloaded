"use client";

import { Consts } from "@ssr/common/consts";
import { MapCategory, MapSort } from "@ssr/common/maps/types";
import { parseAsBoolean, parseAsFloat, parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { createContext, ReactNode, useContext } from "react";

const defaultCategory = MapCategory.DateRanked;
const defaultSort = MapSort.Descending;

type FilterContextProps = {
  category: number;
  sort: number;
  starMin: number;
  starMax: number;
  search: string;
  setSearch: (search: string) => void;
  setCategory: (category: number) => void;
  setSort: (sort: number) => void;
  setStarMin: (starMin: number) => void;
  setStarMax: (starMax: number) => void;

  verified: boolean;
  ranked: boolean;
  qualified: boolean;
  setVerified: (verified: boolean) => void;
  setRanked: (ranked: boolean) => void;
  setQualified: (qualified: boolean) => void;

  clearFilters: () => void;
  hasFiltersApplied: () => boolean;
};
const MapFilterContext = createContext<FilterContextProps | undefined>(undefined);

export const MapFilterProvider = ({ children }: { children: ReactNode }) => {
  const [category, setCategory] = useQueryState(
    "category",
    parseAsInteger.withDefault(defaultCategory)
  );
  const [sort, setSort] = useQueryState("sort", parseAsInteger.withDefault(defaultSort));
  const [starMin, setStarMin] = useQueryState("starMin", parseAsFloat.withDefault(0));
  const [starMax, setStarMax] = useQueryState(
    "starMax",
    parseAsFloat.withDefault(Consts.MAX_STARS)
  );
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));

  const [verified, setVerified] = useQueryState("verified", parseAsBoolean.withDefault(false));
  const [ranked, setRanked] = useQueryState("ranked", parseAsBoolean.withDefault(false));
  const [qualified, setQualified] = useQueryState("qualified", parseAsBoolean.withDefault(false));

  const clearFilters = () => {
    setCategory(defaultCategory);
    setSort(defaultSort);
    setStarMin(0);
    setStarMax(Consts.MAX_STARS);
    setSearch("");
    setVerified(false);
    setRanked(false);
    setQualified(false);
  };

  const hasFiltersApplied = () => {
    return (
      category !== defaultCategory ||
      sort !== defaultSort ||
      starMin !== 0 ||
      starMax !== Consts.MAX_STARS ||
      verified ||
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
        verified,
        ranked,
        qualified,
        setVerified,
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
