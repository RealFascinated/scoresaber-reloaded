import { useUpdateUserPreferences, useUserPreference } from "@/hooks/use-user-preferences";
import { parseAsString, useQueryState } from "nuqs";
import { createContext, ReactNode, useContext, useEffect } from "react";
import { toast } from "sonner";

type FilterContextProps = {
  country: string | undefined;

  setCountry: (country: string | undefined) => void;
  clearFilters: () => void;
  resetFilters: () => void;
};
const LeaderboardFilterContext = createContext<FilterContextProps | undefined>(undefined);

export const LeaderboardFilterProvider = ({ children }: { children: ReactNode }) => {
  const { update } = useUpdateUserPreferences();
  const defaultCountry = useUserPreference("defaultLeaderboardCountry");
  // nuqs uses `null` as the "missing query param" value.
  // Our app code prefers `undefined`, so we map at the boundary.
  const [countryQuery, setCountryQuery] = useQueryState("country", parseAsString);
  const country = countryQuery ?? undefined;
  const setCountry = (value: string | undefined) => setCountryQuery(value ?? null);

  useEffect(() => {
    // Keep previous behaviour: if URL has no country, fall back to the saved default.
    if (countryQuery == null && defaultCountry) {
      setCountryQuery(defaultCountry);
    }
  }, [countryQuery, defaultCountry, setCountryQuery]);

  const clearFilters = () => {
    setCountry(undefined);
  };

  const resetFilters = () => {
    setCountry(undefined);
    update({ defaultLeaderboardCountry: null });

    toast.success("Reset your filters");
  };

  return (
    <LeaderboardFilterContext.Provider value={{ country, setCountry, clearFilters, resetFilters }}>
      {children}
    </LeaderboardFilterContext.Provider>
  );
};

export const useLeaderboardFilter = (initialCountry?: string): FilterContextProps => {
  const context = useContext(LeaderboardFilterContext);
  if (!context) {
    return {
      country: initialCountry ?? undefined,
      setCountry: () => {},
      clearFilters: () => {},
      resetFilters: () => {},
    };
  }
  return context;
};
