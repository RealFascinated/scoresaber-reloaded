import {
  changePinnedScore,
  fetchPinnedScoreIds,
  fetchPlayerPinnedScores,
} from "@/common/pinned-scores/pinned-scores-api";
import { useRealm } from "@/components/providers/realm-provider";
import useMe from "@/hooks/use-me";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

const PINNED_QUERY_KEY = ["user", "pinned-scores"] as const;
const PINNED_MUTATION_KEY = ["user", "pinned-scores", "update"] as const;
const NOTHING_PINNED: number[] = [];

/**
 * Gets the scores a player pinned to the top of their profile.
 */
export function usePlayerPinnedScores(playerId: string) {
  const { realmId } = useRealm();
  return useQuery({
    queryKey: ["player", playerId, "pinned-scores", realmId],
    queryFn: () => fetchPlayerPinnedScores(playerId, realmId),
    staleTime: 1000 * 60,
  });
}

/**
 * Pins and unpins the signed-in user's own scores. The pin state updates immediately and is
 * rolled back if the backend refuses. Changes are sent one after another.
 */
export function usePinnedScoreActions() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isSignedIn = !!me;

  const { data } = useQuery({
    queryKey: PINNED_QUERY_KEY,
    queryFn: fetchPinnedScoreIds,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: isSignedIn,
  });
  const pinnedScoreIds = data ?? NOTHING_PINNED;

  const mutation = useMutation({
    mutationKey: PINNED_MUTATION_KEY,
    scope: { id: "user-pinned-scores" },
    mutationFn: ({ scoreId, action }: { scoreId: number; action: "pin" | "unpin" }) =>
      changePinnedScore(scoreId, action),
    onMutate: async ({ scoreId, action }) => {
      await queryClient.cancelQueries({ queryKey: PINNED_QUERY_KEY });
      const previous = queryClient.getQueryData<number[]>(PINNED_QUERY_KEY) ?? NOTHING_PINNED;
      queryClient.setQueryData<number[]>(
        PINNED_QUERY_KEY,
        action === "pin"
          ? [...previous.filter(id => id !== scoreId), scoreId]
          : previous.filter(id => id !== scoreId)
      );
      return { previous };
    },
    onSuccess: saved => {
      if (queryClient.isMutating({ mutationKey: PINNED_MUTATION_KEY }) <= 1) {
        queryClient.setQueryData(PINNED_QUERY_KEY, saved);
      }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(PINNED_QUERY_KEY, context?.previous);
      toast.error(error instanceof Error ? error.message : "Failed to update your pinned scores");
    },
    onSettled: () => {
      // The pinned section shows the scores themselves, so reload it for every realm
      if (me?.playerId && queryClient.isMutating({ mutationKey: PINNED_MUTATION_KEY }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: ["player", me.playerId, "pinned-scores"] });
      }
    },
  });

  const pin = useCallback(
    (scoreId: number): "pinned" | "already-pinned" | "limit-reached" => {
      const pinned = queryClient.getQueryData<number[]>(PINNED_QUERY_KEY) ?? NOTHING_PINNED;
      if (pinned.includes(scoreId)) {
        return "already-pinned";
      }
      if (pinned.length >= SHARED_CONSTS.maxPinnedScores) {
        return "limit-reached";
      }
      mutation.mutate({ scoreId, action: "pin" });
      return "pinned";
    },
    [queryClient, mutation.mutate]
  );

  const unpin = useCallback(
    (scoreId: number) => mutation.mutate({ scoreId, action: "unpin" }),
    [mutation.mutate]
  );

  return { pinnedScoreIds, pin, unpin, isSignedIn };
}
