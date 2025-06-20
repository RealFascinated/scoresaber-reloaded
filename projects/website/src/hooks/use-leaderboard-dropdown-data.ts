import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

type DropdownData = {
  scoreStats?: ScoreStatsResponse;
};

export function useLeaderboardDropdownData(
  leaderboardId: number,
  scoreId: string,
  isExpanded: boolean,
  additionalData?: { scoreId: number }
) {
  return useQuery<DropdownData>({
    queryKey: [`leaderboardDropdownData:${leaderboardId}`, leaderboardId, scoreId, isExpanded],
    queryFn: async () => {
      return {
        scoreStats: additionalData
          ? await ssrApi.fetchScoreStats(additionalData.scoreId)
          : undefined,
      };
    },
    staleTime: 30000,
    enabled: isExpanded,
  });
}
