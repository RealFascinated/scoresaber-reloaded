"use client";

import Card from "@/components/card";
import { ScoreHistory } from "@/components/platform/scoresaber/score/score-views/score-history";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import { MapStats } from "@/components/score/map-stats";
import { Button } from "@/components/ui/button";
import { CubeIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { ChartBarIcon, TrendingUpIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { getPageFromRank } from "@ssr/common/utils/utils";

import Avatar from "@/components/avatar";
import LeaderboardScores from "@/components/platform/scoresaber/leaderboard/leaderboard-scores";
import ScoreSaberScoreButtons from "@/components/platform/scoresaber/score/buttons/score-buttons";
import ScoreSaberScoreInfo from "@/components/platform/scoresaber/score/score-info";
import ScoreSaberScoreSongInfo from "@/components/platform/scoresaber/score/score-song-info";
import ScoreSaberScoreStats from "@/components/platform/scoresaber/score/score-stats";
import PlayerPreview from "@/components/player/player-preview";
import { Separator } from "@/components/ui/separator";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ScoreHistoryGraph } from "./score-views/score-history-graph";

type DropdownData = {
  scoreStats?: ScoreStatsResponse;
};

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
  { name: ScoreMode.Overview, icon: <CubeIcon className="w-4 h-4" /> },
  { name: ScoreMode.ScoreHistory, icon: <TrendingUpIcon className="w-4 h-4" /> },
  { name: ScoreMode.ScoreHistoryGraph, icon: <ChartBarIcon className="w-4 h-4" /> },
];

const defaultMode = ScoreMode.Overview;

export default function ScoreSaberScoreDisplay({
  leaderboard,
  beatSaverMap,
  score,
  settings,
  highlightedPlayerId,
  playerAbove,
}: {
  highlightedPlayerId?: string;
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  playerAbove?: ScoreSaberLeaderboardPlayerInfoToken;
  settings?: {
    noScoreButtons?: boolean;
    hideLeaderboardDropdown?: boolean;
    defaultLeaderboardDropdown?: ScoreMode;
    hideAccuracyChanger?: boolean;
    disablePadding?: boolean;
    hideRank?: boolean;
    allowLeaderboardPreview?: boolean;
  };
}) {
  const [baseScore, setBaseScore] = useState(score.score);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [mode, setMode] = useState<ScoreMode>(settings?.defaultLeaderboardDropdown ?? defaultMode);

  const scoresPage = useMemo(() => getPageFromRank(score.rank, 12), [score.rank]);
  const isMobile = useIsMobile();

  const { data: dropdownData, isLoading } = useQuery<DropdownData>({
    queryKey: [
      `leaderboardDropdownData:${leaderboard.id}`,
      leaderboard.id,
      score.scoreId,
      isLeaderboardExpanded,
    ],
    queryFn: async () => {
      return {
        scoreStats: score.additionalData
          ? await ssrApi.fetchScoreStats(score.additionalData.scoreId)
          : undefined,
      };
    },
    staleTime: 30000,
    enabled: isLeaderboardExpanded,
  });

  useEffect(() => {
    setIsLeaderboardExpanded(false);
    setMode(settings?.defaultLeaderboardDropdown ?? defaultMode);
  }, [score.scoreId, settings?.defaultLeaderboardDropdown]);

  useEffect(() => {
    setBaseScore(score.score);
  }, [score]);

  const accuracy = useMemo(
    () => (baseScore / leaderboard.maxScore) * 100,
    [baseScore, leaderboard.maxScore]
  );
  const pp = useMemo(
    () =>
      baseScore === score.score
        ? score.pp
        : ApiServiceRegistry.getInstance()
            .getScoreSaberService()
            .getPp(leaderboard.stars, accuracy),
    [baseScore, score.score, score.pp, leaderboard.stars, accuracy]
  );

  const handleLeaderboardOpen = useCallback(
    (isExpanded: boolean) => {
      if (!isExpanded) {
        setMode(settings?.defaultLeaderboardDropdown ?? defaultMode);
      }
      setIsLeaderboardExpanded(isExpanded);
    },
    [settings?.defaultLeaderboardDropdown]
  );

  const handleModeChange = useCallback((mode: ScoreMode) => {
    setMode(mode);
  }, []);

  const gridColsClass = useMemo(
    () =>
      settings?.noScoreButtons
        ? "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_350px]"
        : "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_350px]",
    [settings?.noScoreButtons]
  );

  const memoizedScore = useMemo(() => ({ ...score, accuracy, pp }), [score, accuracy, pp]);

  return (
    <div className={`${settings?.disablePadding ? "" : "pb-2 pt-2"} relative`}>
      {playerAbove && (
        <PlayerPreview playerId={playerAbove.id}>
          <div className="flex items-center gap-2 pl-2">
            <Avatar
              src={playerAbove.profilePicture ?? getScoreSaberAvatar(playerAbove)}
              alt={playerAbove.name ?? ""}
              size={20}
            />
            <Link
              href={`/player/${playerAbove.id}`}
              className="hover:brightness-[66%] transition-all cursor-pointer"
            >
              <p className="text-sm">{playerAbove.name}</p>
            </Link>
          </div>
        </PlayerPreview>
      )}
      <div
        className={`grid w-full gap-2 lg:gap-0 ${gridColsClass} ${settings?.hideRank ? "pt-1" : ""}`}
      >
        <ScoreSaberScoreInfo
          score={score}
          leaderboard={leaderboard}
          hideRank={settings?.hideRank}
        />

        <ScoreSaberScoreSongInfo
          leaderboard={leaderboard}
          beatSaverMap={beatSaverMap}
          allowLeaderboardPreview={settings?.allowLeaderboardPreview && !isMobile}
        />

        {!settings?.noScoreButtons && (
          <ScoreSaberScoreButtons
            leaderboard={leaderboard}
            beatSaverMap={beatSaverMap}
            score={score}
            alwaysSingleLine={isMobile}
            hideLeaderboardDropdown={settings?.hideLeaderboardDropdown}
            hideAccuracyChanger={settings?.hideAccuracyChanger}
            setIsLeaderboardExpanded={handleLeaderboardOpen}
            isLeaderboardLoading={isLoading}
            updateScore={updatedScore => setBaseScore(updatedScore.score)}
          />
        )}

        <ScoreSaberScoreStats score={memoizedScore} leaderboard={leaderboard} />
      </div>

      <AnimatePresence>
        {isLeaderboardExpanded && dropdownData && !isLoading && (
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
            className="w-full mt-2 origin-top"
          >
            <Card className="flex gap-4 w-full relative border border-input">
              <div className="flex flex-col w-full gap-2 justify-center items-center">
                <div className="flex flex-wrap justify-center lg:justify-start gap-2">
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

                {beatSaverMap && <MapStats beatSaver={beatSaverMap} />}
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
                  {mode === ScoreMode.Overview ? (
                    <ScoreOverview leaderboard={leaderboard} scoreStats={dropdownData.scoreStats} />
                  ) : mode === ScoreMode.ScoreHistory ? (
                    <ScoreHistory playerId={score.playerId} leaderboard={leaderboard} />
                  ) : (
                    <ScoreHistoryGraph
                      playerId={score.playerId}
                      leaderboardId={leaderboard.id.toString()}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <Separator />

              <LeaderboardScores
                initialPage={scoresPage}
                leaderboard={leaderboard}
                highlightedPlayerId={highlightedPlayerId}
                disableUrlChanging
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
