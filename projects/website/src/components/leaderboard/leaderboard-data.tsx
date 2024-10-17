"use client";

import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { LeaderboardInfo } from "@/components/leaderboard/leaderboard-info";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchLeaderboard } from "@ssr/common/utils/leaderboard.util";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";

const REFRESH_INTERVAL = 1000 * 60 * 5;

type LeaderboardDataProps = {
  /**
   * The initial leaderboard data.
   */
  initialLeaderboard: LeaderboardResponse<ScoreSaberLeaderboard>;

  /**
   * The initial score data.
   */
  initialScores?: LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
};

export function LeaderboardData({ initialLeaderboard, initialScores }: LeaderboardDataProps) {
  const [currentLeaderboardId, setCurrentLeaderboardId] = useState(initialLeaderboard.leaderboard.id);

  let leaderboard = initialLeaderboard;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", currentLeaderboardId],
    queryFn: async (): Promise<LeaderboardResponse<ScoreSaberLeaderboard> | undefined> => {
      return fetchLeaderboard<ScoreSaberLeaderboard>("scoresaber", currentLeaderboardId + "");
    },
    refetchInterval: REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
  });

  if (data && (!isLoading || !isError)) {
    leaderboard = data;
  }

  return (
    <main className="flex flex-col-reverse xl:flex-row w-full gap-2">
      <LeaderboardScores
        leaderboard={leaderboard.leaderboard}
        initialScores={initialScores}
        leaderboardChanged={newId => setCurrentLeaderboardId(newId)}
        showDifficulties
        isLeaderboardPage
      />
      <LeaderboardInfo leaderboard={leaderboard.leaderboard} beatSaverMap={leaderboard.beatsaver} />
    </main>
  );
}
