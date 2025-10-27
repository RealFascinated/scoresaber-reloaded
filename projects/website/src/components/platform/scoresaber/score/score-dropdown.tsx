"use client";

import Card from "@/components/card";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { ScoreHistory } from "@/components/platform/scoresaber/score/score-views/score-history";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import { Button } from "@/components/ui/button";
import { useLeaderboardDropdownData } from "@/hooks/use-leaderboard-dropdown-data";
import { CubeIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChartBarIcon, TrendingUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";

const ScoreHistoryGraph = dynamic(() => import("./score-views/score-history-graph"), {
  ssr: false,
});

export enum ScoreMode {
  Overview = "Overview",
  ScoreHistory = "Score History",
  ScoreHistoryGraph = "Score History Graph",
}

type Mode = {
  name: ScoreMode;
  icon: React.ReactNode;
};

const modes: Mode[] = [
  { name: ScoreMode.Overview, icon: <CubeIcon className="h-4 w-4" /> },
  { name: ScoreMode.ScoreHistory, icon: <TrendingUpIcon className="h-4 w-4" /> },
  { name: ScoreMode.ScoreHistoryGraph, icon: <ChartBarIcon className="h-4 w-4" /> },
];

const defaultMode = ScoreMode.Overview;

export default function ScoreDropdown({
  score,
  leaderboard,
  beatSaverMap,
  highlightedPlayerId,
  isExpanded,
  defaultMode: initialMode = defaultMode,
  showLeaderboardScores = true,
  showMapStats = true,
  defaultScoresPage,
  onModeChange,
  onLoadingChange,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  highlightedPlayerId?: string;
  isExpanded: boolean;
  defaultMode?: ScoreMode;
  showLeaderboardScores?: boolean;
  showMapStats?: boolean;
  defaultScoresPage?: number;
  onModeChange?: (mode: ScoreMode) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}) {
  const [mode, setMode] = useState<ScoreMode>(initialMode);

  const { data: dropdownData, isLoading } = useLeaderboardDropdownData(
    leaderboard.id,
    score.scoreId,
    isExpanded,
    score.additionalData
  );

  const scoresPage = defaultScoresPage ?? getPageFromRank(score.rank, 12);

  const handleModeChange = useCallback(
    (newMode: ScoreMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange]
  );

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const renderModeContent = () => {
    if (!dropdownData) return null;

    switch (mode) {
      case ScoreMode.Overview:
        return (
          <ScoreOverview
            score={score}
            leaderboard={leaderboard}
            scoreStats={dropdownData.scoreStats}
          />
        );
      case ScoreMode.ScoreHistory:
        return <ScoreHistory playerId={score.playerId} leaderboard={leaderboard} />;
      case ScoreMode.ScoreHistoryGraph:
        return (
          <Suspense
            fallback={<div className="flex items-center justify-center p-4">Loading...</div>}
          >
            <ScoreHistoryGraph
              playerId={score.playerId}
              leaderboardId={leaderboard.id.toString()}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

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
          className="w-full origin-top pt-3"
        >
          {/* Mode Switcher */}
          <div className="mb-3 flex w-full justify-center">
            <div className="flex flex-wrap justify-center gap-2">
              {modes.map(modeItem => (
                <Button
                  key={modeItem.name}
                  variant={mode === modeItem.name ? "default" : "outline"}
                  onClick={() => handleModeChange(modeItem.name)}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  {modeItem.icon}
                  <span>{modeItem.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Map Stats */}
          {showMapStats && beatSaverMap && (
            <div className="mb-2 flex w-full justify-center">
              <div className="bg-secondary/90 border-border flex w-full flex-wrap justify-center gap-1 rounded-md border px-2 py-1 shadow-inner md:w-auto md:gap-2 md:rounded-xl">
                <MapStats beatSaver={beatSaverMap} />
              </div>
            </div>
          )}

          {/* Main Card Content */}
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            {renderModeContent()}
          </motion.div>

          {/* Leaderboard Scores */}
          {showLeaderboardScores && (
            <div className="mt-2">
              <Card className="bg-background/90 rounded-xl p-4 shadow-xl">
                <LeaderboardScores
                  initialPage={scoresPage}
                  leaderboard={leaderboard}
                  highlightedPlayerId={highlightedPlayerId}
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
