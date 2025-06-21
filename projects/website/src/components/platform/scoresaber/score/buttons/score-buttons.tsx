"use client";

import ScoreSaberScoreEditorButton from "@/components/platform/scoresaber/score/buttons/score-editor-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreBsrButton } from "@/components/score/button/score-bsr-button";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { SongOpenInYoutubeButton } from "@/components/score/button/song-open-in-youtube-button";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ArrowDownIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import clsx from "clsx";
import { useCallback, useMemo, useState, useTransition } from "react";

type Props = {
  score?: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  alwaysSingleLine?: boolean;
  hideLeaderboardDropdown?: boolean;
  hideAccuracyChanger?: boolean;
  isLeaderboardLoading?: boolean;
  setIsLeaderboardExpanded?: (isExpanded: boolean) => void;
  updateScore?: (score: ScoreSaberScore) => void;
};

type ButtonConfig = {
  render: (props: Props) => React.ReactNode;
};

const buttons: ButtonConfig[] = [
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <ScoreBsrButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <BeatSaverMapButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
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
    render: () => null,
  },
  {
    render: () => null,
  },
  {
    render: ({ score }: Props) => {
      if (!score?.additionalData) {
        return null;
      }
      return <ScoreReplayButton additionalData={score.additionalData} />;
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
}: Props) {
  const isMobile = useIsMobile();
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const memoizedButtons = useMemo(() => buttons, []);

  const handleDropdownToggle = useCallback(() => {
    const newExpandedState = !leaderboardExpanded;

    // Use transition to mark state updates as non-urgent
    startTransition(() => {
      setLeaderboardExpanded(newExpandedState);
      setIsLeaderboardExpanded?.(newExpandedState);
    });
  }, [leaderboardExpanded, setIsLeaderboardExpanded]);

  const buttonProps = useMemo(
    () => ({
      score,
      leaderboard,
      beatSaverMap,
      alwaysSingleLine,
      setIsLeaderboardExpanded,
      isLeaderboardLoading,
      updateScore,
      hideLeaderboardDropdown,
      hideAccuracyChanger,
    }),
    [
      score,
      leaderboard,
      beatSaverMap,
      alwaysSingleLine,
      setIsLeaderboardExpanded,
      isLeaderboardLoading,
      updateScore,
      hideLeaderboardDropdown,
      hideAccuracyChanger,
    ]
  );

  const renderedButtons = useMemo(() => {
    return memoizedButtons.map((button, index) => {
      const { render } = button;

      const buttonElement = render(buttonProps);

      if (isMobile && !buttonElement) {
        return null;
      }

      return <div key={index}>{buttonElement}</div>;
    });
  }, [memoizedButtons, buttonProps, isMobile]);

  return (
    <div className={`flex items-center justify-end gap-1 lg:mr-2`}>
      <div
        className={`flex min-w-0 flex-row items-center justify-end gap-1 lg:grid lg:min-w-[92px] lg:grid-cols-3 lg:justify-center`}
      >
        {renderedButtons}
      </div>

      <div
        className={`flex gap-1 ${alwaysSingleLine ? "flex-row" : "flex-row lg:flex-col"} items-center justify-center`}
      >
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
            <Button
              variant="ghost"
              className="h-[28px] w-[28px] p-0"
              onClick={handleDropdownToggle}
              disabled={isLeaderboardLoading || isPending}
            >
              {isLeaderboardLoading || isPending ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownIcon
                  className={clsx(
                    "h-4 w-4 transition-transform",
                    leaderboardExpanded ? "rotate-180" : ""
                  )}
                />
              )}
            </Button>
          )}
      </div>
    </div>
  );
}
