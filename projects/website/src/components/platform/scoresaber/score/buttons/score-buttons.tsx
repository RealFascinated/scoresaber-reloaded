"use client";

import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SharedIcons } from "@/shared-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { useMemo } from "react";
import { ScoreInstallMapButton } from "../../../../score/button/score-install-map-button";
import ScoreEditorButton from "./score-editor-button";
import ScoreHistoryGraphButton from "./score-history-graph-buton";

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMap;
  isLeaderboardLoading?: boolean;
  isPreviousScore?: boolean;
  updateScore?: (score: ScoreSaberScore) => void;
};

type ButtonConfig = {
  id: string;
  display: (props: Props) => boolean;
  render: (props: Props) => React.ReactNode;
};

const buttons: ButtonConfig[] = [
  {
    id: "copy-bsr",
    display: ({ beatSaverMap, isPreviousScore }: Props) => {
      return beatSaverMap != undefined && !isPreviousScore;
    },
    render: ({ beatSaverMap }: Props) => {
      return <ScoreCopyBsrButton beatSaverMap={beatSaverMap!} />;
    },
  },
  {
    id: "beat-saver-map",
    display: ({ beatSaverMap, isPreviousScore }: Props) => {
      return beatSaverMap != undefined && !isPreviousScore;
    },
    render: ({ beatSaverMap }: Props) => {
      return <BeatSaverMapButton beatSaverMap={beatSaverMap!} />;
    },
  },
  {
    id: "score-editor",
    display: ({ score }: Props) => {
      return score?.beatLeaderScore != undefined;
    },
    render: ({ score, leaderboard, updateScore }: Props) => {
      return <ScoreEditorButton score={score!} leaderboard={leaderboard!} updateScore={updateScore!} />;
    },
  },
  {
    id: "score-history",
    display: ({ score }: Props) => {
      return score.previousScore != undefined;
    },
    render: ({ score }: Props) => {
      return <ScoreHistoryGraphButton score={score} />;
    },
  },
  {
    id: "replay",
    display: ({ score }: Props) => {
      return score?.beatLeaderScore != undefined;
    },
    render: ({ score }: Props) => {
      return <ScoreReplayButton score={score.beatLeaderScore} />;
    },
  },
  {
    id: "install-map",
    display: ({ beatSaverMap, isPreviousScore }: Props) => {
      return beatSaverMap != undefined && !isPreviousScore;
    },
    render: ({ beatSaverMap }: Props) => {
      return <ScoreInstallMapButton beatSaverMap={beatSaverMap!} />;
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

  const renderedButtons = visibleButtons.map(button => (
    <div key={button.id} className="shrink-0">
      {button.render(buttonProps)}
    </div>
  ));

  if (visibleButtons.length === 0) {
    return null;
  }

  // When the row is narrow the buttons are folded into a menu so it stays compact
  return (
    <>
      <Popover>
        <PopoverTrigger
          aria-label="Score actions"
          className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors @3xl:hidden"
        >
          <SharedIcons.ScoreActionsMenuIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-auto flex-wrap gap-1 p-2">
          {renderedButtons}
        </PopoverContent>
      </Popover>

      <div
        className="hidden min-w-0 flex-wrap justify-end gap-1 @3xl:flex"
        style={{ width: (visibleButtons.length / 2) * 40 }}
      >
        {renderedButtons}
      </div>
    </>
  );
}
