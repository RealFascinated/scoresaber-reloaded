"use client";

import Card from "@/components/card";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import { ScoreHistory } from "@/components/platform/scoresaber/score/score-views/score-history";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLeaderboardDropdownData } from "@/hooks/use-leaderboard-dropdown-data";
import { CubeIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChartBarIcon, TrendingUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

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

  const scoresPage = useMemo(
    () => defaultScoresPage ?? getPageFromRank(score.rank, 12),
    [score.rank, defaultScoresPage]
  );

  const handleModeChange = useCallback(
    (newMode: ScoreMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange]
  );

  // Notify parent component of loading state changes
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  if (!isExpanded || !dropdownData || isLoading) {
    return null;
  }

  const renderModeContent = () => {
    switch (mode) {
      case ScoreMode.Overview:
        return <ScoreOverview leaderboard={leaderboard} scoreStats={dropdownData.scoreStats} />;
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0, scale: 0.95 }}
        animate={{ opacity: 1, height: "auto", scale: 1 }}
        exit={{ opacity: 0, height: 0, scale: 0.95 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
          height: { duration: 0.3 },
          opacity: { duration: 0.2 },
        }}
        className="mt-2 w-full origin-top"
      >
        <Card className="border-input relative flex w-full gap-4 border">
          <div className="flex w-full flex-col items-center justify-center gap-2">
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {modes.map(modeItem => (
                <Button
                  key={modeItem.name}
                  variant={modeItem.name === mode ? "default" : "outline"}
                  onClick={() => handleModeChange(modeItem.name)}
                  className="flex gap-2"
                >
                  {modeItem.icon}
                  <p>{modeItem.name}</p>
                </Button>
              ))}
            </div>

            {showMapStats && beatSaverMap && <MapStats beatSaver={beatSaverMap} />}
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="w-full"
            >
              {renderModeContent()}
            </motion.div>
          </AnimatePresence>

          {showLeaderboardScores && (
            <>
              <Separator />

              <div className="w-full">
                <LeaderboardScores
                  initialPage={scoresPage}
                  leaderboard={leaderboard}
                  highlightedPlayerId={highlightedPlayerId}
                  disableUrlChanging
                />
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
