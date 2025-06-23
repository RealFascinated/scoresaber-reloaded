"use client";

import { MapCategory, MapSort, StarFilter } from "@ssr/common/maps/types";
import { createContext, ReactNode, useContext, useState } from "react";

const defaultCategory = MapCategory.DateRanked;
const defaultSort = MapSort.Descending;

type FilterContextProps = {
  category: number;
  sort: number;
  stars: StarFilter | undefined;
  setCategory: (category: number) => void;
  setSort: (sort: number) => void;
  setStars: (stars: StarFilter | undefined) => void;

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
  const [category, setCategory] = useState<number>(defaultCategory);
  const [sort, setSort] = useState<number>(defaultSort);
  const [stars, setStars] = useState<StarFilter | undefined>(undefined);

  const [verified, setVerified] = useState<boolean>(false);
  const [ranked, setRanked] = useState<boolean>(false);
  const [qualified, setQualified] = useState<boolean>(false);

  const clearFilters = () => {
    setCategory(defaultCategory);
    setSort(defaultSort);
    setStars(undefined);
  };

  const hasFiltersApplied = () => {
    return category !== undefined || sort !== undefined || stars !== undefined;
  };

  return (
    <MapFilterContext.Provider
      value={{
        category,
        sort,
        stars,
        setCategory,
        setSort,
        setStars,
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
