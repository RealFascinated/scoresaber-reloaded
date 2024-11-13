import { createContext, ReactNode, useContext, useState } from "react";

type FilterContextProps = {
  country: string | undefined;

  setCountry: (country: string | undefined) => void;

  clearFilters: () => void;
};
const LeaderboardFilterContext = createContext<FilterContextProps | undefined>(undefined);

export const LeaderboardFilterProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountry] = useState<string | undefined>(undefined);

  const clearFilters = () => {
    setCountry(undefined);
  };

  return (
    <LeaderboardFilterContext.Provider value={{ country, setCountry, clearFilters }}>
      {children}
    </LeaderboardFilterContext.Provider>
  );
};

/**
 * Use the leaderboard filter context.
 */
export const useLeaderboardFilter = (): FilterContextProps => {
  const context = useContext(LeaderboardFilterContext);
  if (!context) throw new Error("useLeaderboardFilter must be used within a LeaderboardFilterContext");
  return context;
};
