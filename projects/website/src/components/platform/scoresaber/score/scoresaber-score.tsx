"use client";

import { useEffect, useState } from "react";

import { cn } from "@/common/utils";
import { useIsMobile } from "@/contexts/viewport-context";

import FallbackLink from "@/components/fallback-link";
import ScoreSaberScoreButtons from "@/components/platform/scoresaber/score/buttons/score-buttons";
import ScoreSaberScoreInfo from "@/components/platform/scoresaber/score/score-info";
import ScoreSaberScoreStats from "@/components/platform/scoresaber/score/score-stats";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { StarIcon } from "@heroicons/react/24/solid";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ArrowDownIcon, ChevronDown, ChevronRight, Loader2Icon } from "lucide-react";
import ScoreDetailsDropdown from "./score-details-dropdown";
import { Spinner } from "@/components/spinner";

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
    hideDetailsDropdown?: boolean;
    hideAccuracyChanger?: boolean;
    disablePadding?: boolean;
    defaultLeaderboardScoresPage?: number;
    medalsMode?: boolean;
    isPreviousScore?: boolean;
  };
}) {
  const isMobile = useIsMobile("2xl");
  const [baseScore, setBaseScore] = useState(score.score);

  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  useEffect(() => {
    setDetailsExpanded(false);
  }, [score.scoreId]);

  useEffect(() => {
    setBaseScore(score.score);
  }, [score]);

  const accuracy = (baseScore / leaderboard.maxScore) * 100;
  const pp = baseScore === score.score ? score.pp : ScoreSaberCurve.getPp(leaderboard.stars, accuracy);

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
            <ScoreSongInfo
              song={{
                name: leaderboard.fullName,
                authorName: leaderboard.songAuthorName,
                art: leaderboard.songArt,
              }}
              level={{
                authorName: leaderboard.levelAuthorName,
                difficulty: leaderboard.difficulty.difficulty,
              }}
              worth={{
                value: leaderboard.stars,
                icon: StarIcon,
              }}
              beatSaverMap={beatSaverMap}
              leaderboardId={leaderboard.id}
            />
          </div>

          <div className="flex items-center justify-end gap-(--spacing-md) px-(--spacing-md)">
            {!settings?.noScoreButtons && (
              <ScoreSaberScoreButtons
                leaderboard={leaderboard}
                beatSaverMap={beatSaverMap}
                score={score}
                alwaysSingleLine={isMobile}
                hideDetailsDropdown={settings?.hideDetailsDropdown}
                hideAccuracyChanger={settings?.hideAccuracyChanger}
                updateScore={updatedScore => setBaseScore(updatedScore.score)}
                isPreviousScore={settings?.isPreviousScore}
              />
            )}

            {/* View Leaderboard button */}
            {detailsExpanded != undefined && setDetailsExpanded != undefined && !settings?.hideDetailsDropdown && (
              <SimpleTooltip display="View score details and leaderboard scores">
                <button className="cursor-pointer size-6" onClick={() => setDetailsExpanded(!detailsExpanded)}>
                  {isDetailsLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <ChevronDown
                      className={cn("size-6 transition-transform duration-200", detailsExpanded ? "" : "rotate-180")}
                    />
                  )}
                </button>
              </SimpleTooltip>
            )}
          </div>

          <ScoreSaberScoreStats
            score={{ ...score, accuracy, pp }}
            leaderboard={leaderboard}
            medalsMode={settings?.medalsMode}
          />
        </div>

        {!isMobile && (
          <FallbackLink href={score.isTracked ? `/score/${score.scoreId}` : undefined}>
            <SimpleTooltip display={score.isTracked ? "View score" : "No score data found :("} className="px-1">
              <ChevronRight
                className={cn("h-6 w-4", score.isTracked ? "cursor-pointer" : "cursor-not-allowed text-red-400")}
              />
            </SimpleTooltip>
          </FallbackLink>
        )}
      </div>

      <ScoreDetailsDropdown
        score={score}
        leaderboard={leaderboard}
        beatSaverMap={beatSaverMap}
        isExpanded={detailsExpanded}
        defaultScoresPage={settings?.defaultLeaderboardScoresPage}
        isLoading={setIsDetailsLoading}
      />
    </div>
  );
}
