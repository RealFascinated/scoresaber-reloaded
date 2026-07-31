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
  /**
   * The star rating change history for the leaderboard.
   */
  starChangeHistory: LeaderboardStarChange[];
};

export function ScoreSaberLeaderboardData({ leaderboardData, starChangeHistory }: LeaderboardDataProps) {
  const { leaderboard } = leaderboardData;

  return (
    <LeaderboardFilterProvider>
      <div className="mx-auto flex w-full flex-col gap-6 px-4">
        <LeaderboardInfo leaderboard={leaderboardData} starChangeHistory={starChangeHistory} />
        <div className="border-border w-full border-t" />
        <div className="flex w-full flex-col gap-4">
          <LeaderboardScores leaderboard={leaderboard} />
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
