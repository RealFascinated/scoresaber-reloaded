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
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);

  const additionalData = score?.additionalData;
  return (
    <div className={`flex justify-end gap-2 items-center mr-1`}>
      <div className={`flex lg:grid grid-cols-3 gap-1 items-center justify-center min-w-[92px]`}>
        {beatSaverMap != undefined && (
          <>
            <ScoreBsrButton beatSaverMap={beatSaverMap} />
            <BeatSaverMapButton beatSaverMap={beatSaverMap} />
          </>
        )}

        <SongOpenInYoutubeButton leaderboard={leaderboard} />

        <div className="hidden lg:block" />
        <div className="hidden lg:block" />

        {additionalData != undefined && (
          <>
            <ScoreReplayButton additionalData={additionalData} />
          </>
        )}
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
