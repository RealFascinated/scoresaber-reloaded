"use client";

import * as React from "react";
import { useState } from "react";
import { ArrowDownIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import ScoreEditorButton from "@/components/score/button/score-editor-button";
import { ScoreBsrButton } from "@/components/score/button/score-bsr-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { SongOpenInYoutubeButton } from "@/components/score/button/song-open-in-youtube-button";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { useIsMobile } from "@/hooks/use-is-mobile";

type Props = {
  score?: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMap;
  alwaysSingleLine?: boolean;
  hideLeaderboardDropdown?: boolean;
  hideAccuracyChanger?: boolean;
  isLeaderboardLoading?: boolean;
  setIsLeaderboardExpanded?: (isExpanded: boolean) => void;
  updateScore?: (score: ScoreSaberScore) => void;
};

const buttons = [
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

  return (
    <div className={`flex justify-end gap-2 items-center mr-1`}>
      <div className={`flex lg:grid grid-cols-3 gap-1 items-center justify-center min-w-[92px]`}>
        {buttons.map((button, index) => {
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
        className={`flex gap-2 ${alwaysSingleLine ? "flex-row" : "flex-row lg:flex-col"} items-center justify-center pr-1`}
      >
        {/* Edit score button */}
        {score && leaderboard && updateScore && !hideAccuracyChanger && (
          <ScoreEditorButton score={score} leaderboard={leaderboard} updateScore={updateScore} />
        )}

        {/* View Leaderboard button */}
        {leaderboardExpanded != undefined && setIsLeaderboardExpanded != undefined && !hideLeaderboardDropdown && (
          <div className="flex items-center justify-center cursor-default">
            {isLeaderboardLoading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowDownIcon
                className={clsx(
                  "w-6 h-6 transition-all transform-gpu cursor-pointer",
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
