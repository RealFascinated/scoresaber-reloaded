import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get the user's preferences.
 *
 * @returns the user's preferences, undefined if the user is not logged in.
 */
export function usePreferences() {
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => ssrApi.getUserPreferences(),
  });

  return {
    preferences,
    isLoading,
    error,
  };
}
