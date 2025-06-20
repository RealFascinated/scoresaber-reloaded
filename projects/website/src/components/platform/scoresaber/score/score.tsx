"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { getPageFromRank } from "@ssr/common/utils/utils";

import Avatar from "@/components/avatar";
import ScoreSaberScoreButtons from "@/components/platform/scoresaber/score/buttons/score-buttons";
import ScoreSaberScoreInfo from "@/components/platform/scoresaber/score/score-info";
import ScoreSaberScoreSongInfo from "@/components/platform/scoresaber/score/score-song-info";
import ScoreSaberScoreStats from "@/components/platform/scoresaber/score/score-stats";
import PlayerPreview from "@/components/player/player-preview";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import Link from "next/link";
import ScoreDropdown, { ScoreMode } from "./score-dropdown";

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
  const [mode, setMode] = useState<ScoreMode>(
    settings?.defaultLeaderboardDropdown ?? ScoreMode.Overview
  );
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  const scoresPage = useMemo(() => getPageFromRank(score.rank, 12), [score.rank]);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsLeaderboardExpanded(false);
    setMode(settings?.defaultLeaderboardDropdown ?? ScoreMode.Overview);
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

  const gridColsClass = useMemo(
    () =>
      settings?.noScoreButtons
        ? "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_350px]"
        : "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_350px]",
    [settings?.noScoreButtons]
  );

  const memoizedScore = useMemo(() => ({ ...score, accuracy, pp }), [score, accuracy, pp]);

  return (
    <div className={`${settings?.disablePadding ? "" : "pt-2 pb-2"} relative`}>
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
              className="cursor-pointer transition-all hover:brightness-[66%]"
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
            isLeaderboardLoading={isLeaderboardLoading}
            updateScore={updatedScore => setBaseScore(updatedScore.score)}
          />
        )}

        <ScoreSaberScoreStats score={memoizedScore} leaderboard={leaderboard} />
      </div>

      <ScoreDropdown
        score={score}
        leaderboard={leaderboard}
        beatSaverMap={beatSaverMap}
        highlightedPlayerId={highlightedPlayerId}
        isExpanded={isLeaderboardExpanded}
        defaultMode={mode}
        onModeChange={handleModeChange}
        onLoadingChange={handleLoadingChange}
      />
    </div>
  );
}
