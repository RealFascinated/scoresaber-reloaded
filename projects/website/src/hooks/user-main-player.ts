import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get the user's player.
 *
 * @returns the user's player, undefined if the user is not logged in.
 */
export function useMainPlayer() {
  const {
    data: mainPlayer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["mainPlayer"],
    queryFn: () => ssrApi.getUserMainPlayer(),
  });

  return {
    mainPlayer,
    isLoading,
    isError,
  };
}
