"use client";

import Card from "@/components/card";
import ScoreSaberLeaderboardFilters from "@/components/platform/scoresaber/leaderboard/leaderboard-filters";
import { LeaderboardInfo } from "@/components/platform/scoresaber/leaderboard/leaderboard-info";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { useIsMobile } from "@/contexts/viewport-context";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { LeaderboardStarChangeHistory } from "../leaderboard-star-change-history";

type LeaderboardDataProps = {
  /**
   * The initial leaderboard data.
   */
  initialLeaderboard: LeaderboardResponse;

  /**
   * The initial page.
   */
  initialPage?: number;

  /**
   * The initial category.
   */
  initialCategory?: ScoreModeEnum;
};

export function ScoreSaberLeaderboardData({
  initialLeaderboard,
  initialPage,
  initialCategory,
}: LeaderboardDataProps) {
  const country = useSearchParams().get("country");
  const isMobile = useIsMobile();
  const [currentLeaderboardId, setCurrentLeaderboardId] = useState(
    initialLeaderboard.leaderboard.id
  );

  const { data } = useQuery({
    queryKey: ["leaderboard", currentLeaderboardId],
    queryFn: async (): Promise<LeaderboardResponse | undefined> => {
      return ssrApi.fetchLeaderboard(currentLeaderboardId + "", "full");
    },
    placeholderData: data => data ?? initialLeaderboard,
  });

  const leaderboardResponse = data ?? initialLeaderboard;
  const { leaderboard, beatsaver } = leaderboardResponse;

  return (
    <LeaderboardFilterProvider initialCountry={country ?? undefined}>
      <div className="w-full space-y-2">
        <div className="flex w-full flex-col-reverse gap-2 xl:flex-row xl:gap-2">
          {/* Mobile Sidebar */}
          {isMobile && <ScoreSaberLeaderboardFilters />}

          {/* Main Content Area */}
          <div className="flex w-full flex-col gap-2">
            {/* Leaderboard Scores */}
            <Card className="relative w-full gap-(--spacing-sm)">
              <LeaderboardScores
                leaderboard={leaderboard}
                beatSaver={beatsaver}
                initialPage={initialPage}
                initialCategory={initialCategory}
                leaderboardChanged={newId => setCurrentLeaderboardId(newId)}
                showDifficulties
                isLeaderboardPage
              />

              {/* Star Change History */}
              {leaderboardResponse.starChangeHistory &&
                leaderboardResponse.starChangeHistory.length > 0 && (
                  <div className="pt-2">
                    <LeaderboardStarChangeHistory
                      key={leaderboardResponse.leaderboard.id}
                      starChangeHistory={leaderboardResponse.starChangeHistory}
                    />
                  </div>
                )}
            </Card>
          </div>

          {/* Desktop Sidebar */}
          <div className="flex w-full flex-col gap-2 xl:w-[550px]">
            {/* Leaderboard Info */}
            <LeaderboardInfo leaderboard={leaderboardResponse} />

            {/* Leaderboard Filters */}
            {!isMobile && <ScoreSaberLeaderboardFilters />}
          </div>
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
