import { SettingIds } from "@/common/database/database";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

type FilterContextProps = {
  country: string | undefined;

  setCountry: (country: string | undefined) => void;
  clearFilters: () => void;
  resetFilters: () => void;
};
const LeaderboardFilterContext = createContext<FilterContextProps | undefined>(undefined);

export const LeaderboardFilterProvider = ({ children }: { children: ReactNode }) => {
  const database = useDatabase();
  const defaultCountry = useLiveQuery(() =>
    database.getSetting<string>(SettingIds.DefaultLeaderboardCountry)
  );
  const [country, setCountry] = useState<string | undefined>();

  useEffect(() => {
    setCountry(defaultCountry ?? undefined);
  }, [defaultCountry]);

  const clearFilters = () => {
    setCountry(undefined);
  };

  const resetFilters = () => {
    setCountry(undefined);
    database.setSetting(SettingIds.DefaultLeaderboardCountry, undefined);

    toast.success("Reset your filters");
  };

  return (
    <LeaderboardFilterContext.Provider value={{ country, setCountry, clearFilters, resetFilters }}>
      {children}
    </LeaderboardFilterContext.Provider>
  );
};

/**
 * Use the leaderboard filter context.
 */
export const useLeaderboardFilter = (): FilterContextProps => {
  const context = useContext(LeaderboardFilterContext);
  if (!context) {
    return {
      country: undefined,
      setCountry: () => {},
      clearFilters: () => {},
      resetFilters: () => {},
    };
  }
  return context;
};
