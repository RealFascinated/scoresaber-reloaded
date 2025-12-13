"use client";

import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { SongOpenInYoutubeButton } from "@/components/score/button/song-open-in-youtube-button";
import { useIsMobile } from "@/contexts/viewport-context";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { useMemo } from "react";
import ScoreEditorButton from "./score-editor-button";

type Props = {
  score?: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  isLeaderboardLoading?: boolean;
  isPreviousScore?: boolean;
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
    display: ({ score }: Props) => {
      return score?.additionalData != undefined;
    },
    render: ({ score, leaderboard, updateScore }: Props) => {
      return <ScoreEditorButton score={score!} leaderboard={leaderboard!} updateScore={updateScore!} />;
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
];

export default function ScoreSaberScoreButtons({
  score,
  leaderboard,
  beatSaverMap,
  updateScore,
  isPreviousScore,
}: Props) {
  const isMobile = useIsMobile("lg");

  const buttonProps = useMemo(
    () => ({
      score,
      leaderboard,
      beatSaverMap,
      updateScore,
      isPreviousScore,
    }),
    [score, leaderboard, beatSaverMap, updateScore, isPreviousScore]
  );
  const visibleButtons = useMemo(() => buttons.filter(button => button.display(buttonProps)), [buttonProps]);

  return (
    <div
      className="flex min-w-0 flex-wrap justify-end gap-1"
      style={{
        width: isMobile ? "auto" : (visibleButtons.length / 2) * 40,
      }}
    >
      {visibleButtons
        .filter(button => button.display(buttonProps))
        .map((button, index) => (
          <div key={index} className="shrink-0">
            {button.render(buttonProps)}
          </div>
        ))}
    </div>
  );
}
