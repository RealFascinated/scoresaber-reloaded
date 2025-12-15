"use client";

import { cn } from "@/common/utils";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import { useLeaderboardDropdownData } from "@/hooks/use-leaderboard-dropdown-data";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export default function ScoreDetailsDropdown({
  score,
  leaderboard,
  beatSaverMap,
  highlightedPlayerId,
  isExpanded,
  showLeaderboardScores = true,
  defaultScoresPage,
  isLeaderboardScore = false,
  isLoading: setIsDetailsLoading,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  highlightedPlayerId?: string;
  isExpanded: boolean;
  showLeaderboardScores?: boolean;
  defaultScoresPage?: number;
  isLeaderboardScore?: boolean;
  isLoading: (isLoading: boolean) => void;
}) {
  const { data: dropdownData, isLoading } = useLeaderboardDropdownData(
    leaderboard.id,
    score.scoreId,
    isExpanded,
    score.additionalData
  );

  useEffect(() => {
    if (setIsDetailsLoading) {
      setIsDetailsLoading(isLoading);
    }
  }, [setIsDetailsLoading, isLoading]);

  const scoresPage = defaultScoresPage ?? getPageFromRank(score.rank, 12);
  if (isLoading) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isExpanded && dropdownData && (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.97 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.97 }}
          transition={{
            ease: [0.4, 0, 0.2, 1],
            height: { duration: 0.25 },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
          }}
          className={cn(
            "flex w-full origin-top flex-col gap-(--spacing-md) px-(--spacing-xs)",
            !isLeaderboardScore ? "mt-2" : ""
          )}
        >
          {/* Map Stats */}
          {beatSaverMap && <MapStats beatSaver={beatSaverMap} />}

          {/* Main Card Content */}
          <ScoreOverview score={score} leaderboard={leaderboard} scoreStats={dropdownData.scoreStats} />

          {/* Leaderboard Scores */}
          {showLeaderboardScores && (
            <LeaderboardScores
              initialPage={scoresPage}
              leaderboard={leaderboard}
              highlightedPlayerId={highlightedPlayerId}
              historyPlayerId={score.playerId}
              disableUrlChanging
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
