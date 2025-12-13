"use client";

import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { SongOpenInYoutubeButton } from "@/components/score/button/song-open-in-youtube-button";
import { useIsMobile } from "@/contexts/viewport-context";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { useCallback, useState, useTransition } from "react";
import ScoreEditorButton from "./score-editor-button";

type Props = {
  score?: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  alwaysSingleLine?: boolean;
  hideDetailsDropdown?: boolean;
  hideAccuracyChanger?: boolean;
  isLeaderboardLoading?: boolean;
  isPreviousScore?: boolean;
  setDetailsExpanded?: (isExpanded: boolean) => void;
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
      return <ScoreCopyBsrButton beatSaverMap={beatSaverMap!} />;
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
  {
    display: ({ score }: Props) => {
      return score?.additionalData != undefined;
    },
    render: ({ score, leaderboard, updateScore }: Props) => {
      return <ScoreEditorButton score={score!} leaderboard={leaderboard!} updateScore={updateScore!} />;
    },
  },
];

export default function ScoreSaberScoreButtons({
  score,
  leaderboard,
  beatSaverMap,
  alwaysSingleLine,
  updateScore,
  hideAccuracyChanger,
  isPreviousScore,
}: Props) {
  const isMobile = useIsMobile("2xl");

  const buttonProps = {
    score,
    leaderboard,
    beatSaverMap,
    alwaysSingleLine,
    updateScore,
    hideAccuracyChanger,
    isPreviousScore,
  };

  return (
    <div className="flex flex-col justify-center items-end">
      {/* Score Buttons */}
      <div
        className="flex w-full flex-wrap justify-end gap-1"
        style={{
          width: isMobile ? "auto" : (buttons.filter(button => button.display(buttonProps)).length / 2) * 40,
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
    </div>
  );
}
