"use client";

import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { useEffect, useState } from "react";
import ScoreButtons from "./score-buttons";
import ScoreSongInfo from "./score-info";
import ScoreRankInfo from "./score-rank-info";
import ScoreStats from "./score-stats";
import { motion } from "framer-motion";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/beatsaver-map";

type Props = {
  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The leaderboard.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The beat saver map for this song.
   */
  beatSaverMap?: BeatSaverMap;

  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * Score settings
   */
  settings?: {
    noScoreButtons: boolean;
  };
};

export default function Score({ player, leaderboard, beatSaverMap, score, settings }: Props) {
  const [baseScore, setBaseScore] = useState<number>(score.score);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);

  /**
   * Set the base score
   */
  useEffect(() => {
    if (score?.score) {
      setBaseScore(score.score);
    }
  }, [score]);

  /**
   * Close the leaderboard when the score changes
   */
  useEffect(() => {
    setIsLeaderboardExpanded(false);
  }, [score]);

  const accuracy = (baseScore / leaderboard.maxScore) * 100;
  const pp = baseScore === score.score ? score.pp : scoresaberService.getPp(leaderboard.stars, accuracy);

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
              setBaseScore(score.score);
            }}
          />
        )}
        <ScoreStats
          score={{
            ...score,
            score: baseScore,
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
