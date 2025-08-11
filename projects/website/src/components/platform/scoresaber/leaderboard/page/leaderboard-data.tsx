"use client";

import Card from "@/components/card";
import { LeaderboardBeatSaverInfo } from "@/components/leaderboard/beatsaver-info";
import ScoreSaberLeaderboardFilters from "@/components/platform/scoresaber/leaderboard/leaderboard-filters";
import { LeaderboardInfo } from "@/components/platform/scoresaber/leaderboard/leaderboard-info";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import HmdUsageChart from "@/components/score/charts/hmd-usage-chart";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { useIsMobile } from "@/contexts/viewport-context";
import { DetailType } from "@ssr/common/detail-type";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { PlaysByHmdResponse } from "@ssr/common/response/plays-by-hmd-response";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import LeaderboardPpChart from "../chart/leaderboard-pp-chart";
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
  const isMobile = useIsMobile();
  const [currentLeaderboardId, setCurrentLeaderboardId] = useState(
    initialLeaderboard.leaderboard.id
  );

  const { data } = useQuery({
    queryKey: ["leaderboard", currentLeaderboardId],
    queryFn: async (): Promise<LeaderboardResponse | undefined> => {
      return ssrApi.fetchLeaderboard(currentLeaderboardId + "", DetailType.FULL);
    },
    placeholderData: data => data ?? initialLeaderboard,
  });

  const { data: hmdData } = useQuery<PlaysByHmdResponse>({
    queryKey: ["leaderboard-hmd", currentLeaderboardId],
    queryFn: () => ssrApi.getPlaysByHmdForLeaderboard(currentLeaderboardId.toString()),
  });

  const leaderboardResponse = data ?? initialLeaderboard;
  const { leaderboard, beatsaver } = leaderboardResponse;

  return (
    <LeaderboardFilterProvider>
      <div className="w-full">
        <div className="flex w-full flex-col-reverse gap-2 2xl:flex-row">
          {/* Mobile Only */}
          {isMobile && (
            <div className="flex flex-col gap-2">
              {/* Filters */}
              <ScoreSaberLeaderboardFilters />

              {/* BeatSaver Info */}
              {beatsaver && <LeaderboardBeatSaverInfo beatSaverMap={beatsaver} />}

              {/* PP Chart */}
              {leaderboard.stars > 0 && leaderboard.maxScore > 0 && (
                <LeaderboardPpChart leaderboard={leaderboard} />
              )}

              {/* Headset Distribution */}
              {hmdData && <LeaderboardHmdPlays hmdUsage={hmdData} />}
            </div>
          )}

          <div className="flex w-full flex-col gap-2">
            {/* Leaderboard Scores */}
            <Card className="relative flex h-fit w-full gap-2">
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
              {leaderboardResponse.starChangeHistory && (
                <LeaderboardStarChangeHistory
                  starChangeHistory={leaderboardResponse.starChangeHistory}
                />
              )}
            </Card>

            <div className="grid grid-cols-2 gap-2">
              {/* Mobile Only */}
              {!isMobile && (
                <>
                  {/* Headset Distribution */}
                  {hmdData && <LeaderboardHmdPlays hmdUsage={hmdData} />}

                  {/* PP Chart */}
                  {leaderboard.stars > 0 && leaderboard.maxScore > 0 && (
                    <LeaderboardPpChart leaderboard={leaderboard} />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Leaderboard Data */}
          <div className="flex w-full flex-col gap-2 2xl:w-[550px]">
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

function LeaderboardHmdPlays({ hmdUsage }: { hmdUsage: PlaysByHmdResponse }) {
  return (
    <Card className="flex w-full flex-col gap-2">
      <div className="flex flex-col">
        <p className="font-semibold">Headset Distribution</p>
        <p className="text-sm text-gray-400">
          Shows the distribution of headsets used on this leaderboard.
        </p>
      </div>
      <div className="mt-0 flex w-full items-center justify-center 2xl:mt-6">
        <HmdUsageChart hmdUsage={hmdUsage} />
      </div>
    </Card>
  );
}
