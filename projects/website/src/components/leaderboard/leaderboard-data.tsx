"use client";

import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { LeaderboardInfo } from "@/components/leaderboard/leaderboard-info";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchLeaderboard } from "@ssr/common/utils/leaderboard.util";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import LeaderboardPpChart from "@/components/leaderboard/chart/leaderboard-pp-chart";
import Card from "@/components/card";

type LeaderboardDataProps = {
  /**
   * The initial leaderboard data.
   */
  initialLeaderboard: LeaderboardResponse<ScoreSaberLeaderboard>;

  /**
   * The initial score data.
   */
  initialScores?: LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;

  /**
   * The initial page.
   */
  initialPage?: number;
};

export function LeaderboardData({ initialLeaderboard, initialScores, initialPage }: LeaderboardDataProps) {
  const [currentLeaderboardId, setCurrentLeaderboardId] = useState(initialLeaderboard.leaderboard.id);
  const [currentLeaderboard, setCurrentLeaderboard] = useState(initialLeaderboard);

  const { data } = useQuery({
    queryKey: ["leaderboard", currentLeaderboardId],
    queryFn: async (): Promise<LeaderboardResponse<ScoreSaberLeaderboard> | undefined> => {
      return fetchLeaderboard<ScoreSaberLeaderboard>("scoresaber", currentLeaderboardId + "");
    },
  });

  useEffect(() => {
    if (data) {
      setCurrentLeaderboard(data);
    }
  }, [data]);

  const leaderboard = currentLeaderboard.leaderboard;
  return (
    <main className="flex flex-col-reverse xl:flex-row w-full gap-2 max-w-[1600px]">
      <Card className="flex gap-2 w-full relative h-fit">
        <LeaderboardScores
          leaderboard={leaderboard}
          initialScores={initialScores}
          initialPage={initialPage}
          leaderboardChanged={newId => setCurrentLeaderboardId(newId)}
          showDifficulties
          isLeaderboardPage
        />
      </Card>
      <div className="flex flex-col gap-2 w-full xl:w-[550px]">
        <LeaderboardInfo leaderboard={leaderboard} beatSaverMap={currentLeaderboard.beatsaver} />
        {leaderboard.stars > 0 && leaderboard.maxScore > 0 && <LeaderboardPpChart leaderboard={leaderboard} />}
      </div>
    </main>
  );
}
