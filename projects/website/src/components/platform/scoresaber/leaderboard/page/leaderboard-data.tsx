"use client";

import { useBreadcrumbTitle } from "@/components/layout/breadcrumb-context";
import { LeaderboardInfo } from "@/components/platform/scoresaber/leaderboard/leaderboard-info";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { useRealm } from "@/components/providers/realm-provider";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

type LeaderboardDataProps = {
  leaderboardData: LeaderboardResponse;
  starChangeHistory: LeaderboardStarChange[];
};

export function ScoreSaberLeaderboardData({
  leaderboardData: serverLeaderboardData,
  starChangeHistory: serverStarChangeHistory,
}: LeaderboardDataProps) {
  const { realmId } = useRealm();
  const isDefaultRealm = realmId === DEFAULT_REALM_ID;
  const leaderboardId = serverLeaderboardData.leaderboard.id;

  // The server renders the default realm, other realms are resolved on the client
  const { data: realmLeaderboard } = useQuery({
    queryKey: ["leaderboard", leaderboardId, realmId],
    queryFn: () => ssrApi.fetchLeaderboard(leaderboardId, "full", realmId),
    enabled: !isDefaultRealm,
    staleTime: 60_000,
  });
  const { data: realmStarChanges } = useQuery({
    queryKey: ["leaderboard-star-history", leaderboardId, realmId],
    queryFn: () => ssrApi.getLeaderboardStarHistory(leaderboardId, realmId),
    enabled: !isDefaultRealm,
    staleTime: 60_000,
  });

  const leaderboardData = isDefaultRealm
    ? serverLeaderboardData
    : (realmLeaderboard ?? serverLeaderboardData);
  const starChangeHistory = isDefaultRealm ? serverStarChangeHistory : (realmStarChanges ?? []);
  const { leaderboard } = leaderboardData;
  useBreadcrumbTitle(leaderboard.songName);

  return (
    <LeaderboardFilterProvider>
      <div className="mx-auto flex w-full flex-col gap-4">
        <LeaderboardInfo leaderboard={leaderboardData} starChangeHistory={starChangeHistory} />
        <div className="flex w-full flex-col gap-4">
          <LeaderboardScores leaderboard={leaderboard} />
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
