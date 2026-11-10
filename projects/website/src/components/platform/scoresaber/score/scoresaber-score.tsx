"use client";

import { useState } from "react";

import { cn } from "@/common/utils";
import { useIsMobile } from "@/contexts/viewport-context";

import FallbackLink from "@/components/fallback-link";
import ScoreSaberScoreButtons from "@/components/platform/scoresaber/score/buttons/score-buttons";
import ScoreSaberScoreInfo from "@/components/platform/scoresaber/score/score-info";
import ScoreSaberScoreStats from "@/components/platform/scoresaber/score/score-stats";
import { useRealm } from "@/components/providers/realm-provider";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { SharedIcons } from "@/shared-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import ScoreDetailsDropdown from "./score-details-dropdown";

export default function ScoreSaberScoreDisplay({
  leaderboard,
  beatSaverMap,
  score,
  settings,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMap;
  playerDetails?: ScoreSaberLeaderboardPlayerInfo;
  settings?: {
    noScoreButtons?: boolean;
    hideDetailsDropdown?: boolean;
    hideAccuracyChanger?: boolean;
    defaultLeaderboardScoresPage?: number;
    medalsMode?: boolean;
    isPreviousScore?: boolean;
  };
}) {
  const isMobile = useIsMobile("2xl");
  const { getPp } = useRealm();
  const [baseScore, setBaseScore] = useState(score.score);

  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const [prevScoreId, setPrevScoreId] = useState(score.scoreId);
  if (prevScoreId !== score.scoreId) {
    setPrevScoreId(score.scoreId);
    setDetailsExpanded(false);
  }

  const [prevScore, setPrevScore] = useState(score);
  if (prevScore !== score) {
    setPrevScore(score);
    setBaseScore(score.score);
  }

  const accuracy = (baseScore / leaderboard.maxScore) * 100;
  const pp = baseScore === score.score ? score.pp : getPp(leaderboard.stars, accuracy);

  const isTracked = score.beatLeaderScore != undefined;

  return (
    <div data-ss-score-row className="group/score @container relative px-2 pt-2 pb-2 @3xl:pl-0">
      <div className="flex items-center">
        <div
          className={cn(
            "grid w-full gap-2 @3xl:gap-0",
            "grid-cols-[minmax(0,1fr)_auto]",
            "@3xl:grid-cols-[120px_minmax(120px,1fr)_auto_minmax(240px,300px)]"
          )}
        >
          <ScoreSaberScoreInfo score={score} leaderboard={leaderboard} />

          <div className="flex min-w-0 items-center">
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
              metric={{
                value: leaderboard.stars,
                icon: SharedIcons.DifficultyStarIcon,
              }}
              beatSaverMap={beatSaverMap}
              leaderboardId={leaderboard.id}
            />
          </div>

          <div className="flex items-center justify-end gap-(--spacing-md) px-(--spacing-md)">
            {!settings?.noScoreButtons && (
              <div className="transition-opacity duration-150 focus-within:opacity-100 @3xl:pointer-fine:opacity-40 @3xl:pointer-fine:group-hover/score:opacity-100">
                <ScoreSaberScoreButtons
                  leaderboard={leaderboard}
                  beatSaverMap={beatSaverMap}
                  score={score}
                  updateScore={updatedScore => setBaseScore(updatedScore.score)}
                  isPreviousScore={settings?.isPreviousScore}
                />
              </div>
            )}

            {detailsExpanded != undefined &&
              setDetailsExpanded != undefined &&
              !settings?.hideDetailsDropdown && (
                <SimpleTooltip display="View score details and leaderboard scores">
                  <button
                    className="size-6 cursor-pointer"
                    onClick={() => setDetailsExpanded(!detailsExpanded)}
                  >
                    {isDetailsLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <SharedIcons.ExpandLeaderboardRowIcon
                        className={cn(
                          "size-6 transition-transform duration-200",
                          detailsExpanded ? "" : "rotate-180"
                        )}
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
          <FallbackLink href={isTracked ? `/score/${score.scoreId}` : undefined}>
            <SimpleTooltip display={isTracked ? "Open score page" : "No score data found"} className="pl-1">
              <span
                className={cn(
                  "flex h-10 w-6 items-center justify-center rounded-md transition-colors duration-150",
                  isTracked
                    ? "text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                    : "text-muted-foreground/30 cursor-not-allowed"
                )}
              >
                <SharedIcons.OpenScorePageIcon className="size-4" />
              </span>
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
