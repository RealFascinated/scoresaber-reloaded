import {
  changeFollowing,
  fetchFollowing,
  fetchPlayerFollowList,
  fetchPlayerFollows,
} from "@/common/following/following-api";
import useMe from "@/hooks/use-me";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { useMainPlayerId, usePlayers } from "./use-main-player";

export const FOLLOWING_QUERY_KEY = ["user", "following"] as const;
const FOLLOWING_MUTATION_KEY = ["user", "following", "update"] as const;
const NOT_FOLLOWING: string[] = [];

/**
 * Gets the ids of the players the signed-in user follows (cached). It only changes through
 * `useFollowActions`, which keeps the cache current, so it is never refetched on its own.
 */
export function useFollowingIds(includeSelf?: boolean): string[] {
  const { data } = useQuery({
    queryKey: FOLLOWING_QUERY_KEY,
    queryFn: fetchFollowing,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: NOT_FOLLOWING,
  });
  const mainPlayerId = useMainPlayerId();

  const following = data ?? NOT_FOLLOWING;
  return includeSelf && mainPlayerId ? [...following, mainPlayerId] : following;
}

/**
 * Gets the players the signed-in user follows, sorted by rank.
 */
export function useFollowing(includeSelf?: boolean) {
  return usePlayers(useFollowingIds(includeSelf));
}

/**
 * Follows and unfollows players as the signed-in user. The list updates immediately and is
 * rolled back if the backend refuses. Changes are sent one after another.
 */
export function useFollowActions() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isSignedIn = !!me;

  const mutation = useMutation({
    mutationKey: FOLLOWING_MUTATION_KEY,
    scope: { id: "user-following" },
    mutationFn: ({ playerId, action }: { playerId: string; action: "follow" | "unfollow" }) =>
      changeFollowing(playerId, action),
    onMutate: async ({ playerId, action }) => {
      await queryClient.cancelQueries({ queryKey: FOLLOWING_QUERY_KEY });
      const previous = queryClient.getQueryData<string[]>(FOLLOWING_QUERY_KEY) ?? NOT_FOLLOWING;
      queryClient.setQueryData<string[]>(
        FOLLOWING_QUERY_KEY,
        action === "follow"
          ? [...previous.filter(id => id !== playerId), playerId]
          : previous.filter(id => id !== playerId)
      );
      return { previous };
    },
    onSuccess: saved => {
      // While more changes are queued the cache already holds their result, don't undo them
      if (queryClient.isMutating({ mutationKey: FOLLOWING_MUTATION_KEY }) <= 1) {
        queryClient.setQueryData(FOLLOWING_QUERY_KEY, saved);
      }
      void queryClient.invalidateQueries({
        queryKey: ["player"],
        predicate: q => q.queryKey[2] === "follows",
      });
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(FOLLOWING_QUERY_KEY, context?.previous);
      toast.error(error instanceof Error ? error.message : "Failed to update who you follow");
    },
  });

  const getFollowing = useCallback(
    () => queryClient.getQueryData<string[]>(FOLLOWING_QUERY_KEY) ?? NOT_FOLLOWING,
    [queryClient]
  );

  const follow = useCallback(
    (playerId: string): "followed" | "already-following" | "limit-reached" => {
      const following = getFollowing();
      if (following.includes(playerId)) {
        return "already-following";
      }
      if (following.length >= SHARED_CONSTS.maxFollowing) {
        return "limit-reached";
      }
      mutation.mutate({ playerId, action: "follow" });
      return "followed";
    },
    [getFollowing, mutation.mutate]
  );

  const unfollow = useCallback(
    (playerId: string) => {
      if (getFollowing().includes(playerId)) {
        mutation.mutate({ playerId, action: "unfollow" });
      }
    },
    [getFollowing, mutation.mutate]
  );

  return { follow, unfollow, isSignedIn };
}

/**
 * Gets how many users follow a player and how many players they follow.
 */
export function usePlayerFollows(playerId: string) {
  return useQuery({
    queryKey: ["player", playerId, "follows"],
    queryFn: () => fetchPlayerFollows(playerId),
    staleTime: 1000 * 60,
  });
}

/**
 * Gets the players that follow a player, or that a player follows, sorted by rank.
 *
 * @param enabled whether to load it yet, so lists are only fetched once opened
 */
export function usePlayerFollowList(playerId: string, list: "followers" | "following", enabled: boolean) {
  const { data: ids, isLoading } = useQuery({
    queryKey: ["player", playerId, list],
    queryFn: () => fetchPlayerFollowList(playerId, list),
    staleTime: 1000 * 60,
    enabled,
  });
  const players = usePlayers(ids ?? []);

  return { players: players.data, isLoading: isLoading || players.isLoading, total: ids?.length ?? 0 };
}
