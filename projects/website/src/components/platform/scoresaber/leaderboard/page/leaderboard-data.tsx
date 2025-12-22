"use client";

import Card from "@/components/card";
import ScoreSaberLeaderboardFilters from "@/components/platform/scoresaber/leaderboard/leaderboard-filters";
import { LeaderboardInfo } from "@/components/platform/scoresaber/leaderboard/leaderboard-info";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { useIsMobile } from "@/contexts/viewport-context";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { LeaderboardStarChangeHistory } from "../leaderboard-star-change-history";

type LeaderboardDataProps = {
  /**
   * The initial leaderboard data.
   */
  leaderboardData: LeaderboardResponse;
};

export function ScoreSaberLeaderboardData({ leaderboardData }: LeaderboardDataProps) {
  const isMobile = useIsMobile();
  const { leaderboard, beatsaver } = leaderboardData;

  return (
    <LeaderboardFilterProvider>
      <div className="w-full space-y-2">
        <div className="flex w-full flex-col-reverse gap-2 xl:flex-row xl:gap-2">
          {/* Mobile Sidebar */}
          {isMobile && <ScoreSaberLeaderboardFilters />}

          {/* Main Content Area */}
          <div className="flex w-full flex-col gap-2">
            {/* Leaderboard Scores */}
            <Card className="relative w-full gap-(--spacing-sm)">
              <LeaderboardScores leaderboard={leaderboard} beatSaver={beatsaver} />

              {/* Star Change History */}
              {leaderboardData.starChangeHistory && leaderboardData.starChangeHistory.length > 0 && (
                <div className="pt-2">
                  <LeaderboardStarChangeHistory
                    key={leaderboard.id}
                    starChangeHistory={leaderboardData.starChangeHistory}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Desktop Sidebar */}
          <div className="flex w-full flex-col gap-2 xl:w-[550px]">
            {/* Leaderboard Info */}
            <LeaderboardInfo leaderboard={leaderboardData} />

            {/* Leaderboard Filters */}
            {!isMobile && <ScoreSaberLeaderboardFilters />}
          </div>
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
