"use client";

import { memo, useCallback, useEffect, useState } from "react";

import { cn } from "@/common/utils";
import { useIsMobile } from "@/contexts/viewport-context";

import Avatar from "@/components/avatar";
import ScoreSaberScoreButtons from "@/components/platform/scoresaber/score/buttons/score-buttons";
import ScoreSaberScoreInfo from "@/components/platform/scoresaber/score/score-info";
import ScoreSaberScoreSongInfo from "@/components/platform/scoresaber/score/score-song-info";
import ScoreSaberScoreStats from "@/components/platform/scoresaber/score/score-stats";
import PlayerPreview from "@/components/player/player-preview";
import SimpleLink from "@/components/simple-link";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import ScoreDropdown, { ScoreMode } from "./score-dropdown";

// Memoize the player preview component to prevent unnecessary re-renders
const MemoizedPlayerPreview = memo(PlayerPreview);

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
    defaultLeaderboardScoresPage?: number;
    medalsMode?: boolean;
    isPreviousScore?: boolean;
  };
}) {
  const [baseScore, setBaseScore] = useState(score.score);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [mode, setMode] = useState<ScoreMode>(
    settings?.defaultLeaderboardDropdown ?? ScoreMode.Overview
  );
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    setIsLeaderboardExpanded(false);
    setMode(settings?.defaultLeaderboardDropdown ?? ScoreMode.Overview);
  }, [score.scoreId, settings?.defaultLeaderboardDropdown]);

  useEffect(() => {
    setBaseScore(score.score);
  }, [score]);

  const accuracy = (baseScore / leaderboard.maxScore) * 100;

  const pp =
    baseScore === score.score ? score.pp : ScoreSaberCurve.getPp(leaderboard.stars, accuracy);

  const handleLeaderboardOpen = useCallback(
    (isExpanded: boolean) => {
      if (!isExpanded) {
        setMode(settings?.defaultLeaderboardDropdown ?? ScoreMode.Overview);
      }
      setIsLeaderboardExpanded(isExpanded);
    },
    [settings?.defaultLeaderboardDropdown]
  );

  const handleModeChange = useCallback((newMode: ScoreMode) => {
    setMode(newMode);
  }, []);

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    setIsLeaderboardLoading(isLoading);
  }, []);

  const gridColsClass = settings?.noScoreButtons
    ? "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_350px]"
    : "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_350px]";

  const memoizedScore = { ...score, accuracy, pp };

  const containerClassName = cn(settings?.disablePadding ? "" : "pt-2 pb-2", "relative");

  const gridClassName = cn(
    "grid w-full gap-2 lg:gap-0",
    gridColsClass,
    settings?.hideRank ? "pt-1" : ""
  );

  return (
    <div className={containerClassName}>
      {playerAbove && (
        <MemoizedPlayerPreview playerId={playerAbove.id}>
          <div className="flex items-center gap-2 pl-2">
            <Avatar
              src={playerAbove.profilePicture ?? getScoreSaberAvatar(playerAbove)}
              alt={playerAbove.name ?? ""}
              size={20}
            />
            <SimpleLink
              href={`/player/${playerAbove.id}`}
              className="cursor-pointer transition-all hover:brightness-[66%]"
            >
              <p className="text-sm">{playerAbove.name}</p>
            </SimpleLink>
          </div>
        </MemoizedPlayerPreview>
      )}
      <div className={gridClassName}>
        <ScoreSaberScoreInfo
          score={score}
          leaderboard={leaderboard}
          hideRank={settings?.hideRank}
        />

        <div className="flex min-w-0 items-center overflow-hidden">
          <ScoreSaberScoreSongInfo
            leaderboard={leaderboard}
            beatSaverMap={beatSaverMap}
            allowLeaderboardPreview={settings?.allowLeaderboardPreview && !isMobile}
          />
        </div>

        {!settings?.noScoreButtons && (
          <ScoreSaberScoreButtons
            leaderboard={leaderboard}
            beatSaverMap={beatSaverMap}
            score={score}
            alwaysSingleLine={isMobile}
            hideLeaderboardDropdown={settings?.hideLeaderboardDropdown}
            hideAccuracyChanger={settings?.hideAccuracyChanger}
            setIsLeaderboardExpanded={handleLeaderboardOpen}
            isLeaderboardLoading={isLeaderboardLoading}
            updateScore={updatedScore => setBaseScore(updatedScore.score)}
            isPreviousScore={settings?.isPreviousScore}
          />
        )}

        <ScoreSaberScoreStats
          score={memoizedScore}
          leaderboard={leaderboard}
          medalsMode={settings?.medalsMode}
        />
      </div>

      <ScoreDropdown
        score={score}
        leaderboard={leaderboard}
        beatSaverMap={beatSaverMap}
        highlightedPlayerId={highlightedPlayerId}
        isExpanded={isLeaderboardExpanded}
        defaultMode={mode}
        defaultScoresPage={settings?.defaultLeaderboardScoresPage}
        onModeChange={handleModeChange}
        onLoadingChange={handleLoadingChange}
      />
    </div>
  );
}
