"use client";

import Card from "@/components/card";
import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { LeaderboardBeatSaverInfo } from "@/components/leaderboard/page/beatsaver-info";
import LeaderboardFilters from "@/components/leaderboard/page/leaderboard-filters";
import { LeaderboardInfo } from "@/components/leaderboard/page/leaderboard-info";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LeaderboardPpChart = dynamic(
  () => import("@/components/leaderboard/page/chart/leaderboard-pp-chart"),
  {
    ssr: false,
    loading: () => <div className="h-[360px] flex items-center justify-center">Loading...</div>,
  }
);

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

export function LeaderboardData({
  initialLeaderboard,
  initialPage,
  initialCategory,
}: LeaderboardDataProps) {
  const [currentLeaderboardId, setCurrentLeaderboardId] = useState(
    initialLeaderboard.leaderboard.id
  );
  const [currentLeaderboard, setCurrentLeaderboard] = useState(initialLeaderboard);

  const { data } = useQuery({
    queryKey: ["leaderboard", currentLeaderboardId],
    queryFn: async (): Promise<LeaderboardResponse<ScoreSaberLeaderboard> | undefined> => {
      return ssrApi.fetchLeaderboard(currentLeaderboardId + "", DetailType.FULL);
    },
  });

  useEffect(() => {
    if (data) {
      setCurrentLeaderboard(data);
    }
  }, [data]);

  const leaderboard = currentLeaderboard.leaderboard;
  return (
    <LeaderboardFilterProvider>
      <div className="w-full">
        <div className="flex xl:flex-row flex-col-reverse w-full gap-2">
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
          <div className="flex flex-col gap-2 w-full xl:w-[550px]">
            <LeaderboardInfo
              leaderboard={leaderboard}
              beatSaverMap={currentLeaderboard.beatsaver}
            />
            {currentLeaderboard.beatsaver && (
              <LeaderboardBeatSaverInfo beatSaverMap={currentLeaderboard.beatsaver} />
            )}
            <LeaderboardFilters />
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
