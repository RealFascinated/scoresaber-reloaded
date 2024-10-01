"use client";

import BeatSaverMap from "@/common/database/types/beatsaver-map";
import ScoreSaberPlayerScoreToken from "@/common/model/token/scoresaber/score-saber-player-score-token";
import { beatsaverService } from "@/common/service/impl/beatsaver";
import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { useCallback, useEffect, useState } from "react";
import ScoreButtons from "./score-buttons";
import ScoreSongInfo from "./score-info";
import ScoreRankInfo from "./score-rank-info";
import ScoreStats from "./score-stats";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import { motion } from "framer-motion";

type Props = {
  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The score to display.
   */
  playerScore: ScoreSaberPlayerScoreToken;
};

export default function Score({ player, playerScore }: Props) {
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

  const page = Math.floor(score.rank / 12) + 1;
  return (
    <div className="pb-2 pt-2">
      <div
        className={`grid w-full gap-2 lg:gap-0 first:pt-0 last:pb-0 grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_300px]`}
      >
        <ScoreRankInfo score={score} />
        <ScoreSongInfo leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
        <ScoreButtons
          leaderboard={leaderboard}
          beatSaverMap={beatSaverMap}
          isLeaderboardExpanded={isLeaderboardExpanded}
          setIsLeaderboardExpanded={setIsLeaderboardExpanded}
        />
        <ScoreStats score={score} leaderboard={leaderboard} />
      </div>
      {isLeaderboardExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          exit={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-2"
        >
          <LeaderboardScores initialPage={page} player={player} leaderboard={leaderboard} />
        </motion.div>
      )}
    </div>
  );
}
