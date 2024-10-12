"use client";

import BeatSaverMap from "@/common/database/types/beatsaver-map";
import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { useCallback, useEffect, useState } from "react";
import ScoreButtons from "./score-buttons";
import ScoreSongInfo from "./score-info";
import ScoreRankInfo from "./score-rank-info";
import ScoreStats from "./score-stats";
import { motion } from "framer-motion";
import ScoreSaberPlayer from "@ssr/common/types/player/impl/scoresaber-player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/score-saber-player-score-token";
import { lookupBeatSaverMap } from "@/common/beatsaver-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";

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
    const beatSaverMap = await lookupBeatSaverMap(leaderboard.songHash);
    setBeatSaverMap(beatSaverMap);
  }, [leaderboard.songHash]);

  useEffect(() => {
    fetchBeatSaverData();
  }, [fetchBeatSaverData]);

  return (
    <div className="pb-2 pt-2">
      <div
        className={`grid w-full gap-2 lg:gap-0 first:pt-0 last:pb-0 grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_300px]`}
      >
        <ScoreRankInfo score={score} leaderboard={leaderboard} />
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
          <LeaderboardScores initialPage={getPageFromRank(score.rank, 12)} player={player} leaderboard={leaderboard} />
        </motion.div>
      )}
    </div>
  );
}
