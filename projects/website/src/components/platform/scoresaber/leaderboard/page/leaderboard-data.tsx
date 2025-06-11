"use client";

import Card from "@/components/card";
import { LeaderboardBeatSaverInfo } from "@/components/leaderboard/beatsaver-info";
import ScoreSaberLeaderboardFilters from "@/components/platform/scoresaber/leaderboard/leaderboard-filters";
import { LeaderboardInfo } from "@/components/platform/scoresaber/leaderboard/leaderboard-info";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import LeaderboardHmdPlays from "../chart/leaderboard-hmd-plays";
import LeaderboardPpChart from "../chart/leaderboard-pp-chart";

type LeaderboardDataProps = {
  /**
   * The initial leaderboard data.
   */
  initialLeaderboard: LeaderboardResponse<ScoreSaberLeaderboard>;

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
  const isMobile = useIsMobile();
  const [currentLeaderboardId, setCurrentLeaderboardId] = useState(
    initialLeaderboard.leaderboard.id
  );

  const { data } = useQuery({
    queryKey: ["leaderboard", currentLeaderboardId],
    queryFn: async (): Promise<LeaderboardResponse<ScoreSaberLeaderboard> | undefined> => {
      return ssrApi.fetchLeaderboard(currentLeaderboardId + "", DetailType.FULL);
    },
    placeholderData: data => data ?? initialLeaderboard,
  });

  const leaderboardResponse = data ?? initialLeaderboard;
  const { leaderboard, beatsaver } = leaderboardResponse;

  return (
    <LeaderboardFilterProvider>
      <div className="w-full">
        <div className="flex xl:flex-row flex-col-reverse w-full gap-2">
          {/* Mobile Only */}
          {isMobile && (
            <>
              {/* Headset Distribution */}
              <LeaderboardHmdPlays leaderboard={leaderboard} />

              {/* BeatSaver Info */}
              {beatsaver && <LeaderboardBeatSaverInfo beatSaverMap={beatsaver} />}

              {/* Filters */}
              <ScoreSaberLeaderboardFilters />
            </>
          )}

          {/* Leaderboard Scores */}
          <Card className="flex gap-2 w-full relative h-fit">
            <LeaderboardScores
              leaderboard={leaderboard}
              initialPage={initialPage}
              initialCategory={initialCategory}
              leaderboardChanged={newId => setCurrentLeaderboardId(newId)}
              showDifficulties
              isLeaderboardPage
            />
          </Card>

          {/* Leaderboard Data */}
          <div className="flex flex-col gap-2 w-full xl:w-[550px]">
            {/* Leaderboard Info */}
            <LeaderboardInfo leaderboard={leaderboard} beatSaverMap={beatsaver} />

            {/* Mobile Only */}
            {!isMobile && (
              <>
                {/* Filters */}
                <ScoreSaberLeaderboardFilters />

                {/* BeatSaver Info */}
                {beatsaver && <LeaderboardBeatSaverInfo beatSaverMap={beatsaver} />}

                {/* Headset Distribution */}
                <LeaderboardHmdPlays leaderboard={leaderboard} />
              </>
            )}

            {/* PP Chart */}
            {leaderboard.stars > 0 && leaderboard.maxScore > 0 && (
              <Card>
                <LeaderboardPpChart leaderboard={leaderboard} />
              </Card>
            )}
          </div>
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
