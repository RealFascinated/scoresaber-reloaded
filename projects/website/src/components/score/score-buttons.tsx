"use client";

import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreBsrButton } from "@/components/score/button/score-bsr-button";
import ScoreEditorButton from "@/components/score/button/score-editor-button";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { SongOpenInYoutubeButton } from "@/components/score/button/song-open-in-youtube-button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ArrowDownIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import clsx from "clsx";
import { useMemo, useState } from "react";

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
      return <SongOpenInYoutubeButton leaderboard={leaderboard} />;
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

export default function ScoreButtons({
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

  const memoizedButtons = useMemo(() => buttons, []);

  return (
    <div className={`flex justify-end items-center gap-2 lg:gap-2 lg:mr-1`}>
      <div
        className={`flex flex-row lg:grid lg:grid-cols-3 gap-1 items-center justify-end lg:justify-center min-w-0 lg:min-w-[92px]`}
      >
        {memoizedButtons.map((button, index) => {
          const { render } = button;

          const buttonElement = render({
            score,
            leaderboard,
            beatSaverMap,
            alwaysSingleLine,
            setIsLeaderboardExpanded,
            isLeaderboardLoading,
            updateScore,
            hideLeaderboardDropdown,
            hideAccuracyChanger,
          });

          if (isMobile && !buttonElement) {
            return null;
          }

          return <div key={index}>{buttonElement}</div>;
        })}
      </div>

      <div
        className={`flex gap-1 ${alwaysSingleLine ? "flex-row" : "flex-row lg:flex-col"} items-center justify-center lg:pr-1`}
      >
        {/* Edit score button */}
        {score && leaderboard && updateScore && !hideAccuracyChanger && (
          <ScoreEditorButton score={score} leaderboard={leaderboard} updateScore={updateScore} />
        )}

        {/* View Leaderboard button */}
        {leaderboardExpanded != undefined &&
          setIsLeaderboardExpanded != undefined &&
          !hideLeaderboardDropdown && (
            <div className="flex items-center justify-center cursor-default ml-2 lg:ml-0">
              {isLeaderboardLoading ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowDownIcon
                  className={clsx(
                    "w-6 h-6 transition-all cursor-pointer",
                    leaderboardExpanded ? "" : "rotate-180"
                  )}
                  onClick={() => {
                    setLeaderboardExpanded(!leaderboardExpanded);
                    setIsLeaderboardExpanded?.(!leaderboardExpanded);
                  }}
                />
              )}
            </div>
          )}
      </div>
    </div>
  );
}
