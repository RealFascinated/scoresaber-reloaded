"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/common/utils";
import { useIsMobile } from "@/contexts/viewport-context";

import FallbackLink from "@/components/fallback-link";
import ScoreSaberScoreButtons from "@/components/platform/scoresaber/score/buttons/score-buttons";
import ScoreSaberScoreInfo from "@/components/platform/scoresaber/score/score-info";
import ScoreSaberScoreSongInfo from "@/components/platform/scoresaber/score/score-song-info";
import ScoreSaberScoreStats from "@/components/platform/scoresaber/score/score-stats";
import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ChevronRight } from "lucide-react";
import ScoreDropdown from "./score-dropdown";

export default function ScoreSaberScoreDisplay({
  leaderboard,
  beatSaverMap,
  score,
  settings,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  playerAbove?: ScoreSaberLeaderboardPlayerInfoToken;
  settings?: {
    noScoreButtons?: boolean;
    hideLeaderboardDropdown?: boolean;
    hideAccuracyChanger?: boolean;
    disablePadding?: boolean;
    defaultLeaderboardScoresPage?: number;
    medalsMode?: boolean;
    isPreviousScore?: boolean;
  };
}) {
  const [baseScore, setBaseScore] = useState(score.score);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    setIsLeaderboardExpanded(false);
  }, [score.scoreId]);

  useEffect(() => {
    setBaseScore(score.score);
  }, [score]);

  const accuracy = (baseScore / leaderboard.maxScore) * 100;
  const pp =
    baseScore === score.score ? score.pp : ScoreSaberCurve.getPp(leaderboard.stars, accuracy);

  const handleLeaderboardOpen = useCallback((isExpanded: boolean) => {
    setIsLeaderboardExpanded(isExpanded);
  }, []);

  return (
    <div className={cn(settings?.disablePadding ? "" : "pt-2 pb-2", "relative")}>
      <div className="flex items-center">
        <div
          className={cn(
            "grid w-full gap-2 lg:gap-0",
            settings?.noScoreButtons
              ? "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_350px]"
              : "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_350px]"
          )}
        >
          <ScoreSaberScoreInfo score={score} leaderboard={leaderboard} />

          <div className="flex min-w-0 items-center overflow-hidden">
            <ScoreSaberScoreSongInfo leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
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
              updateScore={updatedScore => setBaseScore(updatedScore.score)}
              isPreviousScore={settings?.isPreviousScore}
            />
          )}

          <ScoreSaberScoreStats
            score={{ ...score, accuracy, pp }}
            leaderboard={leaderboard}
            medalsMode={settings?.medalsMode}
          />
        </div>

        {!isMobile && (
          <FallbackLink
            href={score.isTracked ? `/score/${score.scoreId}` : undefined}
            data-umami-event="score-details-button"
          >
            <SimpleTooltip
              display={score.isTracked ? "View score details" : "No score data found :("}
              className="px-1"
            >
              <ChevronRight
                className={cn(
                  "h-6 w-4",
                  score.isTracked ? "cursor-pointer" : "cursor-not-allowed text-red-400"
                )}
              />
            </SimpleTooltip>
          </FallbackLink>
        )}
      </div>

      <div className={isLeaderboardExpanded ? "mt-2" : ""}>
        <ScoreDropdown
          score={score}
          leaderboard={leaderboard}
          beatSaverMap={beatSaverMap}
          isExpanded={isLeaderboardExpanded}
          defaultScoresPage={settings?.defaultLeaderboardScoresPage}
        />
      </div>
    </div>
  );
}
