"use client";

import { LeaderboardInfo } from "@/components/platform/scoresaber/leaderboard/leaderboard-info";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";

type LeaderboardDataProps = {
  /**
   * The initial leaderboard data.
   */
  leaderboardData: LeaderboardResponse;
  starChangeHistory: LeaderboardStarChange[];
};

export function ScoreSaberLeaderboardData({ leaderboardData, starChangeHistory }: LeaderboardDataProps) {
  const { leaderboard } = leaderboardData;

  return (
    <LeaderboardFilterProvider>
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-2">
        <LeaderboardInfo leaderboard={leaderboardData} starChangeHistory={starChangeHistory} />
        <div className="flex w-full flex-col gap-2">
          <LeaderboardScores leaderboard={leaderboard} />
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
