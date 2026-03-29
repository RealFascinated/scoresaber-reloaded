"use client";

import { cn } from "@/common/utils";
import Card from "@/components/card";
import ScoreSaberScoreDisplay from "@/components/platform/scoresaber/score/scoresaber-score";
import PlayerScoreHeader from "@/components/score/player-score-header";
import { Spinner } from "@/components/spinner";
import { env } from "@ssr/common/env";
import { getHMDInfo } from "@ssr/common/hmds";
import Logger from "@ssr/common/logger";
import { PlayerScore } from "@ssr/common/score/player-score";
import { parseDate } from "@ssr/common/utils/time-utils";
import { useCallback, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import HMDIcon from "../../../../hmd-icon";

const LIVE_FEED_MAX_ITEMS = 12;

const EMPTY_COPY = {
  connecting: "Connecting to the live feed…",
  disconnected: "Disconnected from the live feed. Check your connection or refresh the page.",
  waiting: "Connected — waiting for new scores…",
} as const;

type EmptyVariant = keyof typeof EMPTY_COPY;

type FeedPhase = { kind: "list"; scores: PlayerScore[] } | { kind: "empty"; variant: EmptyVariant };

function sortByNewestFirst(a: PlayerScore, b: PlayerScore): number {
  return (
    parseDate(b.score.timestamp.toString()).getTime() - parseDate(a.score.timestamp.toString()).getTime()
  );
}

function getFeedPhase(readyState: ReadyState, scores: PlayerScore[]): FeedPhase {
  if (scores.length > 0) {
    return { kind: "list", scores };
  }
  if (readyState === ReadyState.CONNECTING) {
    return { kind: "empty", variant: "connecting" };
  }
  if (readyState === ReadyState.CLOSED || readyState === ReadyState.CLOSING) {
    return { kind: "empty", variant: "disconnected" };
  }
  if (readyState === ReadyState.OPEN) {
    return { kind: "empty", variant: "waiting" };
  }
  return { kind: "empty", variant: "connecting" };
}

function FeedConnectionStatus({ readyState }: { readyState: ReadyState }) {
  const state =
    readyState === ReadyState.OPEN ? "open" : readyState === ReadyState.CONNECTING ? "connecting" : "closed";
  const label = { open: "Connected", connecting: "Connecting", closed: "Disconnected" }[state];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        state === "open" && "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        state === "connecting" && "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-400",
        state === "closed" && "border-destructive/35 bg-destructive/10 text-destructive"
      )}
      title="WebSocket status for the live score feed"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          state === "open" && "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]",
          state === "connecting" && "animate-pulse bg-amber-500",
          state === "closed" && "bg-destructive"
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}

function FeedEmptyState({ variant }: { variant: EmptyVariant }) {
  if (variant === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-(--spacing-2xl)">
        <Spinner />
        <p className="text-muted-foreground text-sm">{EMPTY_COPY[variant]}</p>
      </div>
    );
  }

  return (
    <p className="text-muted-foreground py-(--spacing-2xl) text-center text-sm">{EMPTY_COPY[variant]}</p>
  );
}

function FeedScoreList({ scores }: { scores: PlayerScore[] }) {
  return (
    <div className="flex flex-col gap-(--spacing-sm)">
      {scores.map(scoreToken => {
        if (!scoreToken.leaderboard || !scoreToken.score) {
          return null;
        }

        const player = scoreToken.score.playerInfo;
        const score = scoreToken.score;
        const leaderboard = scoreToken.leaderboard;

        return (
          <div key={score.scoreId} className="flex flex-col">
            <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
              <PlayerScoreHeader player={player!} />
              <div className="flex items-center gap-2">
                <HMDIcon hmd={getHMDInfo(score.hmd)} />
                <span className="text-muted-foreground text-xs">
                  {score.hmd ? `on ${score.hmd}` : "Unknown device"}
                </span>
              </div>
            </div>
            <Card className="rounded-lg rounded-tl-none p-0">
              <ScoreSaberScoreDisplay
                score={score}
                leaderboard={leaderboard}
                settings={{
                  noScoreButtons: true,
                  hideDetailsDropdown: true,
                }}
              />
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function FeedBody({ phase }: { phase: FeedPhase }) {
  if (phase.kind === "list") {
    return <FeedScoreList scores={phase.scores} />;
  }
  return <FeedEmptyState variant={phase.variant} />;
}

export default function ScoreFeed() {
  const [scores, setScores] = useState<PlayerScore[]>([]);

  const onMessage = useCallback((event: WebSocketEventMap["message"]) => {
    if (typeof event.data !== "string") {
      return;
    }
    let parsed: PlayerScore;
    try {
      parsed = JSON.parse(event.data) as PlayerScore;
    } catch {
      return;
    }
    if (!parsed.leaderboard || !parsed.score) {
      Logger.error("Invalid leaderboard or score data:", parsed);
      return;
    }

    setScores(prev => {
      const id = parsed.score.scoreId;
      const withoutDup = prev.filter(s => s.score.scoreId !== id);
      return [...withoutDup, parsed].sort(sortByNewestFirst).slice(0, LIVE_FEED_MAX_ITEMS);
    });
  }, []);

  const { readyState } = useWebSocket<PlayerScore>(`${env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/score`, {
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    shouldReconnect: () => true,
    onMessage,
  });

  const phase = getFeedPhase(readyState, scores);

  return (
    <Card className="flex h-fit w-full flex-col 2xl:w-[75%]">
      <div className="mb-(--spacing-lg) flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Live Score Feed</h1>
          <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
            New scores from ScoreSaber appear here as they are submitted. The list keeps the{" "}
            {LIVE_FEED_MAX_ITEMS} most recent plays.
          </p>
        </div>
        <FeedConnectionStatus readyState={readyState} />
      </div>
      <FeedBody phase={phase} />
    </Card>
  );
}
