"use client";

import { LeaderboardInfo } from "@/components/platform/scoresaber/leaderboard/leaderboard-info";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { LeaderboardStarChangeHistory } from "../leaderboard-star-change-history";

type LeaderboardDataProps = {
  /**
   * The initial leaderboard data.
   */
  leaderboardData: LeaderboardResponse;
};

export function ScoreSaberLeaderboardData({ leaderboardData }: LeaderboardDataProps) {
  const { leaderboard, starChangeHistory } = leaderboardData;

  return (
    <LeaderboardFilterProvider>
      <div className="flex w-full flex-col-reverse gap-2 xl:flex-row xl:gap-2">
        <div className="flex w-full flex-col gap-2">
          <LeaderboardScores leaderboard={leaderboard} />
          {starChangeHistory && starChangeHistory.length > 0 && (
            <LeaderboardStarChangeHistory key={leaderboard.id} starChangeHistory={starChangeHistory} />
          )}
        </div>
        <div className="w-full xl:w-[550px]">
          <LeaderboardInfo leaderboard={leaderboardData} />
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
