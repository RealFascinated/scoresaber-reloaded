import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQueries, useQuery } from "@tanstack/react-query";
import useMe from "./use-me";

const PLAYER_STALE_TIME = 1000 * 60 * 60 * 6;

export function playerQuery(id: string) {
  return {
    queryKey: ["player", id, "basic"] as const,
    queryFn: () => ssrApi.getScoreSaberPlayer(id, "basic"),
    staleTime: PLAYER_STALE_TIME,
  };
}

/**
 * Gets the player id of the signed-in user. It comes from the session, undefined when signed out.
 */
export function useMainPlayerId(): string | undefined {
  const { data: me } = useMe();
  return me?.playerId ?? undefined;
}

/**
 * Gets the player of the signed-in user (cached for 6 hours).
 */
export function useMainPlayer() {
  const id = useMainPlayerId();
  const query = useQuery({ ...playerQuery(id ?? ""), enabled: !!id });
  return { ...query, data: id ? query.data : undefined };
}

/**
 * Gets players by id, sorted by rank (cached for 6 hours). Players that couldn't be loaded are left out.
 */
export function usePlayers(ids: string[]) {
  return useQueries({
    queries: ids.map(playerQuery),
    combine: results => ({
      isLoading: results.some(result => result.isLoading),
      data: results.flatMap(result => (result.data ? [result.data] : [])).sort((a, b) => a.rank - b.rank),
    }),
  });
}
