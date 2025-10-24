"use client";

import { cn } from "@/common/utils";
import ScoreSaberScoreEditorButton from "@/components/platform/scoresaber/score/buttons/score-editor-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreBsrButton } from "@/components/score/button/score-bsr-button";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { SongOpenInYoutubeButton } from "@/components/score/button/song-open-in-youtube-button";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/contexts/viewport-context";
import { ArrowDownIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { useCallback, useState, useTransition } from "react";

type Props = {
  score?: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  alwaysSingleLine?: boolean;
  hideLeaderboardDropdown?: boolean;
  hideAccuracyChanger?: boolean;
  isLeaderboardLoading?: boolean;
  isPreviousScore?: boolean;
  setIsLeaderboardExpanded?: (isExpanded: boolean) => void;
  updateScore?: (score: ScoreSaberScore) => void;
};

type ButtonConfig = {
  display: (props: Props) => boolean;
  render: (props: Props) => React.ReactNode;
};

const buttons: ButtonConfig[] = [
  {
    display: ({ beatSaverMap, isPreviousScore }: Props) => {
      return beatSaverMap != undefined && !isPreviousScore;
    },
    render: ({ beatSaverMap }: Props) => {
      return <ScoreBsrButton beatSaverMap={beatSaverMap!} />;
    },
  },
  {
    display: ({ beatSaverMap, isPreviousScore }: Props) => {
      return beatSaverMap != undefined && !isPreviousScore;
    },
    render: ({ beatSaverMap }: Props) => {
      return <BeatSaverMapButton beatSaverMap={beatSaverMap!} />;
    },
  },
  {
    display: ({ leaderboard, isPreviousScore }: Props) => {
      return leaderboard != undefined && !isPreviousScore;
    },
    render: ({ leaderboard }: Props) => {
      return (
        <SongOpenInYoutubeButton
          songName={leaderboard.songName}
          songSubName={leaderboard.songSubName}
          songAuthorName={leaderboard.songAuthorName}
        />
      );
    },
  },
  {
    display: ({ score }: Props) => {
      return score?.additionalData != undefined;
    },
    render: ({ score }: Props) => {
      return <ScoreReplayButton additionalData={score!.additionalData!} />;
    },
  },
];

export default function ScoreSaberScoreButtons({
  score,
  leaderboard,
  beatSaverMap,
  alwaysSingleLine,
  setIsLeaderboardExpanded,
  isLeaderboardLoading,
  updateScore,
  hideLeaderboardDropdown,
  hideAccuracyChanger,
  isPreviousScore,
}: Props) {
  const isMobile = useIsMobile();
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDropdownToggle = useCallback(() => {
    const newExpandedState = !leaderboardExpanded;

    // Use transition to mark state updates as non-urgent
    startTransition(() => {
      setLeaderboardExpanded(newExpandedState);
      setIsLeaderboardExpanded?.(newExpandedState);
    });
  }, [leaderboardExpanded, setIsLeaderboardExpanded]);

  const buttonProps = {
    score,
    leaderboard,
    beatSaverMap,
    alwaysSingleLine,
    setIsLeaderboardExpanded,
    isLeaderboardLoading,
    updateScore,
    hideLeaderboardDropdown,
    hideAccuracyChanger,
    isPreviousScore,
  };

  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center justify-end gap-1 lg:mr-2">
        {/* Score Buttons */}
        <div
          className="flex min-w-0 flex-wrap justify-end gap-1"
          style={{
            width: isMobile
              ? "auto"
              : (buttons.filter(button => button.display(buttonProps)).length / 2) * 40,
          }}
        >
          {buttons
            .filter(button => button.display(buttonProps))
            .map((button, index) => (
              <div key={index} className="shrink-0">
                {button.render(buttonProps)}
              </div>
            ))}
        </div>

        {/* Score Editor and Leaderboard buttons   */}
        <div className={cn("flex gap-1", isMobile ? "flex-row" : "flex-col")}>
          {/* Edit score button */}
          {score && leaderboard && updateScore && !hideAccuracyChanger && (
            <ScoreSaberScoreEditorButton
              score={score}
              leaderboard={leaderboard}
              updateScore={updateScore}
            />
          )}

          {/* View Leaderboard button */}
          {leaderboardExpanded != undefined &&
            setIsLeaderboardExpanded != undefined &&
            !hideLeaderboardDropdown && (
              <SimpleTooltip display="Score stats and leaderboard scores">
                <Button
                  variant="ghost"
                  className="h-[28px] w-[28px] p-0"
                  onClick={handleDropdownToggle}
                  disabled={isLeaderboardLoading || isPending}
                  data-umami-event="score-dropdown-button"
                >
                  {isLeaderboardLoading || isPending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownIcon
                      className={cn(
                        "h-4 w-4 transition-transform",
                        leaderboardExpanded ? "rotate-180" : ""
                      )}
                    />
                  )}
                </Button>
              </SimpleTooltip>
            )}
        </div>
      </div>
    </div>
  );
}