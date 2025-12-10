"use client";

import Card from "@/components/card";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import { useLeaderboardDropdownData } from "@/hooks/use-leaderboard-dropdown-data";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { AnimatePresence, motion } from "framer-motion";

export default function ScoreDropdown({
  score,
  leaderboard,
  beatSaverMap,
  highlightedPlayerId,
  isExpanded,
  showLeaderboardScores = true,
  showMapStats = true,
  defaultScoresPage,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  highlightedPlayerId?: string;
  isExpanded: boolean;
  showLeaderboardScores?: boolean;
  showMapStats?: boolean;
  defaultScoresPage?: number;
}) {
  const { data: dropdownData, isLoading } = useLeaderboardDropdownData(
    leaderboard.id,
    score.scoreId,
    isExpanded,
    score.additionalData
  );

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
            duration: 0.25,
            ease: [0.4, 0, 0.2, 1],
            height: { duration: 0.25 },
            opacity: { duration: 0.18 },
          }}
          className="w-full origin-top"
        >
          {/* Map Stats */}
          {showMapStats && beatSaverMap && (
            <div className="mb-2 flex w-full justify-center">
              <div className="flex w-full flex-wrap justify-center gap-1 md:w-auto">
                <MapStats beatSaver={beatSaverMap} />
              </div>
            </div>
          )}

          {/* Main Card Content */}
          <ScoreOverview
            score={score}
            leaderboard={leaderboard}
            scoreStats={dropdownData.scoreStats}
          />

          {/* Leaderboard Scores */}
          {showLeaderboardScores && (
            <div className="mt-2">
              <Card className="bg-background/90 rounded-xl p-4">
                <LeaderboardScores
                  initialPage={scoresPage}
                  leaderboard={leaderboard}
                  highlightedPlayerId={highlightedPlayerId}
                  historyPlayerId={score.playerId}
                  disableUrlChanging
                />
              </Card>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
