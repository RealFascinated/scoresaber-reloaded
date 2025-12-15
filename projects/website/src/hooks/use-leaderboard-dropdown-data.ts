import { ScoreStatsResponse } from "@ssr/common/schemas/beatleader/score-stats";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type DropdownData = {
  scoreStats?: ScoreStatsResponse;
};

export function useLeaderboardDropdownData(
  leaderboardId: number,
  scoreId: string,
  isExpanded: boolean,
  additionalData?: { scoreId: number }
) {
  const [shouldFetch, setShouldFetch] = useState(false);

  // Debounce the fetch to allow UI updates to complete first
  useEffect(() => {
    if (!isExpanded) {
      setShouldFetch(false);
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
        scoreStats: additionalData ? await ssrApi.fetchScoreStats(additionalData.scoreId) : undefined,
      };
    },
    staleTime: 30000,
    enabled: shouldFetch && isExpanded,
  });
}
