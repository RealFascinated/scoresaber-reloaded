"use client";

import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { LeaderboardInfo } from "@/components/leaderboard/page/leaderboard-info";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import LeaderboardPpChart from "@/components/leaderboard/page/chart/leaderboard-pp-chart";
import Card from "@/components/card";
import { LeaderboardBeatSaverInfo } from "@/components/leaderboard/page/beatsaver-info";
import LeaderboardFilters from "@/components/leaderboard/page/leaderboard-filters";
import { LeaderboardFilterProvider } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ScoreModeEnum } from "@/components/score/score-mode";

type LeaderboardDataProps = {
  /**
   * The leaderboard id.
   */
  leaderboardId: number;

  /**
   * The initial page.
   */
  initialPage?: number;

  /**
   * The initial category.
   */
  initialCategory?: ScoreModeEnum;
};

export function LeaderboardData({ leaderboardId, initialPage, initialCategory }: LeaderboardDataProps) {
  const [currentLeaderboardId, setCurrentLeaderboardId] = useState(leaderboardId);

  const { data } = useQuery({
    queryKey: ["leaderboard", currentLeaderboardId],
    queryFn: async (): Promise<LeaderboardResponse<ScoreSaberLeaderboard> | undefined> =>
      ssrApi.fetchLeaderboard(currentLeaderboardId + "", true),
  });

  if (data == undefined) {
    return null;
  }

  const leaderboard = data.leaderboard;
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
            <LeaderboardInfo leaderboard={leaderboard} beatSaverMap={data.beatsaver} />
            {data.beatsaver && <LeaderboardBeatSaverInfo beatSaverMap={data.beatsaver} />}
            <LeaderboardFilters />
            {leaderboard.stars > 0 && leaderboard.maxScore > 0 && <LeaderboardPpChart leaderboard={leaderboard} />}
          </div>
        </div>
      </div>
    </LeaderboardFilterProvider>
  );
}
