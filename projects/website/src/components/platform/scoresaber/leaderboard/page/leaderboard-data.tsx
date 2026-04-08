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
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-2">
        <LeaderboardInfo leaderboard={leaderboardData} />
        <div className="flex w-full flex-col gap-2">
          <LeaderboardScores leaderboard={leaderboard} />
          {starChangeHistory && starChangeHistory.length > 0 && (
            <LeaderboardStarChangeHistory key={leaderboard.id} starChangeHistory={starChangeHistory} />
          )}
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
