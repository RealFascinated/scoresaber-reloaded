"use client";

import AskChatButton, { useChatAvailable } from "@/components/chat/ask-chat-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMainPlayerId } from "@/hooks/use-main-player";
import { SharedIcons } from "@/shared-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { useMemo } from "react";
import { ScoreInstallMapButton } from "../../../../score/button/score-install-map-button";
import ScoreEditorButton from "./score-editor-button";
import ScoreHistoryGraphButton from "./score-history-graph-buton";
import ScorePinButton from "./score-pin-button";

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMap;
  isLeaderboardLoading?: boolean;
  isPreviousScore?: boolean;
  /** Whether the score belongs to the signed-in user. */
  isOwnScore?: boolean;
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
    id: "install-map",
    display: ({ beatSaverMap, isPreviousScore }: Props) => {
      return beatSaverMap != undefined && !isPreviousScore;
    },
    render: ({ beatSaverMap }: Props) => {
      return <ScoreInstallMapButton beatSaverMap={beatSaverMap!} />;
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
    id: "ask-chat",
    display: ({ isPreviousScore }: Props) => {
      return !isPreviousScore;
    },
    render: ({ score, leaderboard }: Props) => {
      return (
        <AskChatButton
          prompt={`Break down my score ${score.scoreId} on ${leaderboard.songName}`}
          tooltip="Ask the chat about this score"
        />
      );
    },
  },
  {
    id: "replay",
    display: ({ score }: Props) => {
      return score?.beatLeaderScore != undefined;
    },
    render: ({ score }: Props) => {
      return <ScoreReplayButton score={score.beatLeaderScore} scoreSaberScoreId={score.scoreId} />;
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
    id: "pin-score",
    display: ({ isOwnScore }: Props) => {
      return !!isOwnScore;
    },
    render: ({ score }: Props) => {
      return <ScorePinButton scoreId={score.scoreId} />;
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
  const mainPlayerId = useMainPlayerId();
  const chatAvailable = useChatAvailable();
  const isOwnScore = mainPlayerId !== undefined && score.playerId === mainPlayerId;
  const buttonProps = useMemo(
    () => ({
      score,
      leaderboard,
      beatSaverMap,
      updateScore,
      isPreviousScore,
      isOwnScore,
    }),
    [score, leaderboard, beatSaverMap, updateScore, isPreviousScore, isOwnScore]
  );
  const visibleButtons = useMemo(
    () =>
      buttons.filter(button => (button.id !== "ask-chat" || chatAvailable) && button.display(buttonProps)),
    [buttonProps, chatAvailable]
  );

  const renderedButtons = visibleButtons.map(button => (
    <div key={button.id} className="shrink-0">
      {button.render(buttonProps)}
    </div>
  ));

  if (visibleButtons.length === 0) {
    return null;
  }

  return (
    <>
      <Popover>
        <PopoverTrigger
          aria-label="Score actions"
          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground @3xl:hidden"
        >
          <SharedIcons.ScoreActionsMenuIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-auto flex-wrap gap-1 p-2">
          {renderedButtons}
        </PopoverContent>
      </Popover>

      <div dir="rtl" className="hidden grid-flow-col grid-rows-2 gap-1 @3xl:grid">
        {renderedButtons}
      </div>
    </>
  );
}
