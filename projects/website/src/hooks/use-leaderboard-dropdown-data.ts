import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BeatLeaderScore } from "../../../common/src/schemas/beatleader/score/score";

type DropdownData = {
  scoreStats?: ScoreStatsResponse;
};

export function useLeaderboardDropdownData(
  leaderboardId: number,
  scoreId: number,
  isExpanded: boolean,
  beatLeaderScore?: BeatLeaderScore
) {
  const [shouldFetch, setShouldFetch] = useState(false);

  // Debounce the fetch to allow UI updates to complete first
  useEffect(() => {
    if (!isExpanded) {
      queueMicrotask(() => setShouldFetch(false));
      return;
    }

    const timer = setTimeout(() => {
      setShouldFetch(true);
    }, 50); // Small delay to allow UI updates

    return () => clearTimeout(timer);
  }, [isExpanded]);

  return useQuery<DropdownData>({
    queryKey: [`leaderboardDropdownData:${leaderboardId}`, leaderboardId, scoreId, isExpanded],
    queryFn: async () => {
      return {
        scoreStats: beatLeaderScore ? await ssrApi.fetchScoreStats(beatLeaderScore.scoreId) : undefined,
      };
    },
    staleTime: 30000,
    enabled: shouldFetch && isExpanded,
  });
}
