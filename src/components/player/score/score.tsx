"use client";

import { beatsaverFetcher } from "@/common/data-fetcher/impl/beatsaver";
import ScoreSaberPlayerScore from "@/common/data-fetcher/types/scoresaber/scoresaber-player-score";
import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { useCallback, useEffect, useState } from "react";
import ScoreButtons from "./score-buttons";
import ScoreSongInfo from "./score-info";
import ScoreRankInfo from "./score-rank-info";
import ScoreStats from "./score-stats";

type Props = {
  /**
   * The score to display.
   */
  playerScore: ScoreSaberPlayerScore;
};

export default function Score({ playerScore }: Props) {
  const { leaderboard } = playerScore;
  const [beatSaverMap, setBeatSaverMap] = useState<BeatSaverMap | undefined>();

  const fetchBeatSaverData = useCallback(async () => {
    const beatSaverMap = await beatsaverFetcher.lookupMap(leaderboard.songHash);
    setBeatSaverMap(beatSaverMap);
  }, [leaderboard.songHash]);

  useEffect(() => {
    fetchBeatSaverData();
  }, [fetchBeatSaverData]);

  return (
    <div className="grid gap-2 lg:gap-0 pb-2 pt-2 first:pt-0 last:pb-0 grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.85fr_4fr_1fr_300px]">
      <ScoreRankInfo playerScore={playerScore} />
      <ScoreSongInfo playerScore={playerScore} beatSaverMap={beatSaverMap} />
      <ScoreButtons playerScore={playerScore} beatSaverMap={beatSaverMap} />
      <ScoreStats playerScore={playerScore} />
    </div>
  );
}
