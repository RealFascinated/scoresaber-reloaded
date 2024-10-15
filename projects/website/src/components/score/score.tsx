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
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";

type Props = {
  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The score to display.
   */
  playerScore: ScoreSaberPlayerScoreToken;

  /**
   * Score settings
   */
  settings?: {
    noScoreButtons: boolean;
  };
};

export default function Score({ player, playerScore, settings }: Props) {
  const { score, leaderboard } = playerScore;
  const [baseScore, setBaseScore] = useState<number>(score.baseScore);
  const [beatSaverMap, setBeatSaverMap] = useState<BeatSaverMap | undefined>();
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);

  const fetchBeatSaverData = useCallback(async () => {
    // No need to fetch if no buttons
    if (settings?.noScoreButtons == true) {
      return;
    }
    const beatSaverMapData = await lookupBeatSaverMap(leaderboard.songHash);
    setBeatSaverMap(beatSaverMapData);
  }, [leaderboard.songHash, settings?.noScoreButtons]);

  useEffect(() => {
    if (playerScore?.score?.baseScore) {
      setBaseScore(playerScore.score.baseScore);
    }
  }, [playerScore]);

  useEffect(() => {
    fetchBeatSaverData();
  }, [fetchBeatSaverData]);

  const accuracy = (baseScore / leaderboard.maxScore) * 100;
  const pp = baseScore === score.baseScore ? score.pp : scoresaberService.getPp(leaderboard.stars, accuracy);

  // Dynamic grid column classes
  const gridColsClass = settings?.noScoreButtons
    ? "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_300px]" // Fewer columns if no buttons
    : "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_300px]"; // Original with buttons

  return (
    <div className="pb-2 pt-2">
      {/* Score Info */}
      <div className={`grid w-full gap-2 lg:gap-0 ${gridColsClass}`}>
        <ScoreRankInfo score={score} leaderboard={leaderboard} />
        <ScoreSongInfo leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
        {settings?.noScoreButtons !== true && (
          <ScoreButtons
            leaderboard={leaderboard}
            beatSaverMap={beatSaverMap}
            score={score}
            setIsLeaderboardExpanded={setIsLeaderboardExpanded}
            updateScore={score => {
              setBaseScore(score.baseScore);
            }}
          />
        )}
        <ScoreStats
          score={{
            ...score,
            baseScore,
            pp: pp ? pp : score.pp,
          }}
          leaderboard={leaderboard}
        />
      </div>

      {/* Leaderboard */}
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
