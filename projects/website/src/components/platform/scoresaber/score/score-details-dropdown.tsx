"use client";

import { cn } from "@/common/utils";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import { useLeaderboardDropdownData } from "@/hooks/use-leaderboard-dropdown-data";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import LeaderboardScoresDropdown from "../leaderboard/leaderboard-scores-dropdown";

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
    score.beatLeaderScore
  );

  useEffect(() => {
    if (setIsDetailsLoading) {
      setIsDetailsLoading(isLoading);
    }
  }, [setIsDetailsLoading, isLoading]);

  const shouldReduceMotion = useReducedMotion();
  const scoresPage = defaultScoresPage ?? getPageFromRank(score.rank, 12);
  if (isLoading) {
    return null;
  }

  const motionDuration = shouldReduceMotion ? 0 : 0.2;
  const heightDuration = shouldReduceMotion ? 0 : 0.25;

  return (
    <AnimatePresence mode="wait">
      {isExpanded && dropdownData && (
        <m.div
          initial={{ opacity: 0, height: 0, scale: 0.97 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.97 }}
          transition={{
            ease: [0.4, 0, 0.2, 1],
            height: { duration: heightDuration },
            opacity: { duration: motionDuration },
            scale: { duration: motionDuration },
          }}
          className={cn(
            "flex w-full origin-top flex-col gap-(--spacing-md) px-(--spacing-xs)",
            !isLeaderboardScore ? "mt-(--spacing-md)" : ""
          )}
        >
          {/* Map Stats */}
          {beatSaverMap && <MapStats beatSaver={beatSaverMap} />}

          {/* Main Card Content */}
          <ScoreOverview score={score} leaderboard={leaderboard} scoreStats={dropdownData.scoreStats} />

          {/* Leaderboard Scores */}
          {showLeaderboardScores && (
            <LeaderboardScoresDropdown
              initialPage={scoresPage}
              leaderboard={leaderboard}
              highlightedPlayerId={highlightedPlayerId}
              historyPlayerId={score.playerId}
            />
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
