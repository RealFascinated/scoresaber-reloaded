"use client";

import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { LeaderboardInfo } from "@/components/leaderboard/leaderboard-info";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import BeatSaverMap from "@/common/database/types/beatsaver-map";
import ScoreSaberLeaderboardScoresPageToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-scores-page-token";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { lookupBeatSaverMap } from "@/common/beatsaver-utils";

type LeaderboardDataProps = {
  /**
   * The page to show when opening the leaderboard.
   */
  initialPage?: number;

  /**
   * The initial scores to show.
   */
  initialScores?: ScoreSaberLeaderboardScoresPageToken;

  /**
   * The leaderboard to display.
   */
  initialLeaderboard: ScoreSaberLeaderboardToken;
};

export function LeaderboardData({ initialPage, initialScores, initialLeaderboard }: LeaderboardDataProps) {
  const [beatSaverMap, setBeatSaverMap] = useState<BeatSaverMap | undefined>();
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState(initialLeaderboard.id);

  let currentLeaderboard = initialLeaderboard;
  const { data } = useQuery({
    queryKey: ["leaderboard", selectedLeaderboardId],
    queryFn: () => scoresaberService.lookupLeaderboard(selectedLeaderboardId + ""),
    initialData: initialLeaderboard,
  });

  if (data) {
    currentLeaderboard = data;
  }

  const fetchBeatSaverData = useCallback(async () => {
    const beatSaverMap = await lookupBeatSaverMap(initialLeaderboard.songHash);
    setBeatSaverMap(beatSaverMap);
  }, [initialLeaderboard.songHash]);

  useEffect(() => {
    fetchBeatSaverData();
  }, [fetchBeatSaverData]);

  if (!currentLeaderboard) {
    return null;
  }

  return (
    <main className="flex flex-col-reverse xl:flex-row w-full gap-2">
      <LeaderboardScores
        leaderboard={currentLeaderboard}
        initialScores={initialScores}
        initialPage={initialPage}
        showDifficulties
        isLeaderboardPage
        leaderboardChanged={id => setSelectedLeaderboardId(id)}
      />
      <LeaderboardInfo leaderboard={currentLeaderboard} beatSaverMap={beatSaverMap} />
    </main>
  );
}
