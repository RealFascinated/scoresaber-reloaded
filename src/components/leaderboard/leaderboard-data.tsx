"use client";

import ScoreSaberLeaderboardScoresPageToken from "@/common/model/token/scoresaber/score-saber-leaderboard-scores-page-token";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";
import { LeaderboardContext } from "@/components/context/leaderboard-context";
import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { LeaderboardInfo } from "@/components/leaderboard/leaderboard-info";
import { useQuery } from "@tanstack/react-query";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { useCallback, useEffect, useState } from "react";
import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { beatsaverService } from "@/common/service/impl/beatsaver";

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
  const [currentLeaderboard, setCurrentLeaderboard] = useState(initialLeaderboard);

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard-" + initialLeaderboard.id, selectedLeaderboardId],
    queryFn: () => scoresaberService.lookupLeaderboard(selectedLeaderboardId + ""),
    staleTime: 30 * 1000, // Cache data for 30 seconds
  });

  const fetchBeatSaverData = useCallback(async () => {
    const beatSaverMap = await beatsaverService.lookupMap(initialLeaderboard.songHash);
    setBeatSaverMap(beatSaverMap);
  }, [initialLeaderboard.songHash]);

  useEffect(() => {
    fetchBeatSaverData();
  }, [fetchBeatSaverData]);

  /**
   * When the leaderboard changes, update the previous and current leaderboards.
   * This is to prevent flickering between leaderboards.
   */
  useEffect(() => {
    if (leaderboard) {
      setCurrentLeaderboard(leaderboard);
    }
  }, [leaderboard]);

  if (!currentLeaderboard) {
    return null;
  }

  return (
    <main className="flex flex-col-reverse xl:flex-row w-full gap-2">
      <LeaderboardContext.Provider value={currentLeaderboard}>
        <LeaderboardScores
          leaderboard={currentLeaderboard}
          initialScores={initialScores}
          initialPage={initialPage}
          showDifficulties
          isLeaderboardPage
          leaderboardChanged={id => setSelectedLeaderboardId(id)}
        />
        <LeaderboardInfo leaderboard={currentLeaderboard} beatSaverMap={beatSaverMap} />
      </LeaderboardContext.Provider>
    </main>
  );
}
