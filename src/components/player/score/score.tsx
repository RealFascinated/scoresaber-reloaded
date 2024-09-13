"use client";

import { beatsaverService } from "@/common/service/impl/beatsaver";
import ScoreSaberPlayerScore from "@/common/service/types/scoresaber/scoresaber-player-score";
import BeatSaverMap from "@/common/database/types/beatsaver-map";
import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
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
  const { score, leaderboard } = playerScore;
  const [beatSaverMap, setBeatSaverMap] = useState<BeatSaverMap | undefined>();
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);

  const fetchBeatSaverData = useCallback(async () => {
    const beatSaverMap = await beatsaverService.lookupMap(leaderboard.songHash);
    setBeatSaverMap(beatSaverMap);
  }, [leaderboard.songHash]);

  useEffect(() => {
    fetchBeatSaverData();
  }, [fetchBeatSaverData]);

  return (
    <div className="pb-2 pt-2">
      <div className="grid w-full gap-2 lg:gap-0 first:pt-0 last:pb-0 grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.85fr_4fr_1fr_300px]">
        <ScoreRankInfo score={score} />
        <ScoreSongInfo leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
        <ScoreButtons
          playerScore={playerScore}
          beatSaverMap={beatSaverMap}
          isLeaderboardExpanded={isLeaderboardExpanded}
          setIsLeaderboardExpanded={setIsLeaderboardExpanded}
        />
        <ScoreStats score={score} leaderboard={leaderboard} />
      </div>
      {isLeaderboardExpanded && <LeaderboardScores leaderboard={leaderboard} />}
    </div>
  );
}
