"use client";

import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import { PageTitle } from "@/components/page-title";
import ScoreSaberScoreDisplay from "@/components/platform/scoresaber/score/scoresaber-score";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import { getHMDInfo } from "@ssr/common/hmds";
import Logger from "@ssr/common/logger";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { parseDate } from "@ssr/common/utils/time-utils";
import { useCallback, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

const LIVE_FEED_MAX_ITEMS = 12;

const EMPTY_COPY = {
  connecting: "Connecting to the live feed…",
  disconnected: "Disconnected from the live feed. Check your connection or refresh the page.",
  waiting: "Connected — waiting for new scores…",
} as const;

type EmptyVariant = keyof typeof EMPTY_COPY;

type FeedPhase =
  { kind: "list"; scores: PlayerScore<ScoreSaberScore>[] } | { kind: "empty"; variant: EmptyVariant };

function sortByNewestFirst(a: PlayerScore<ScoreSaberScore>, b: PlayerScore<ScoreSaberScore>): number {
  return (
    parseDate(b.score.timestamp.toString()).getTime() - parseDate(a.score.timestamp.toString()).getTime()
  );
}

function getFeedPhase(readyState: ReadyState, scores: PlayerScore<ScoreSaberScore>[]): FeedPhase {
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
        state === "open" && "border-success/35 bg-success/10 text-success",
        state === "connecting" && "border-warning/35 bg-warning/10 text-warning",
        state === "closed" && "border-destructive/35 bg-destructive/10 text-destructive"
      )}
      title="WebSocket status for the live score feed"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          state === "open" && "bg-success shadow-[0_0_8px_var(--success)]",
          state === "connecting" && "bg-warning animate-pulse",
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
      <div className="ring-border bg-card flex flex-col items-center justify-center gap-3 rounded-xl py-12 ring-1">
        <Spinner />
        <p className="text-muted-foreground text-sm">{EMPTY_COPY[variant]}</p>
      </div>
    );
  }

  return (
    <p className="ring-border bg-card text-muted-foreground rounded-xl py-12 text-center text-sm ring-1">
      {EMPTY_COPY[variant]}
    </p>
  );
}

function FeedScoreList({ scores }: { scores: PlayerScore<ScoreSaberScore>[] }) {
  return (
    <div className="ring-border bg-card divide-border divide-y overflow-hidden rounded-xl ring-1">
      {scores.map(scoreToken => {
        if (!scoreToken.leaderboard || !scoreToken.score) {
          return null;
        }

        const player = scoreToken.score.playerInfo;
        const score = scoreToken.score;
        const leaderboard = scoreToken.leaderboard;

        return (
          <div key={score.scoreId}>
            <div className="flex items-center gap-2 px-4 pt-3">
              <Avatar
                src={player?.avatar ?? ""}
                alt={`${player?.name ?? "Unknown"}'s Profile Picture`}
                size={20}
                className="shrink-0"
              />
              <SimpleLink
                href={`/player/${player?.id}`}
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                {player?.name ?? "Unknown"}
              </SimpleLink>
              <div className="ml-auto flex items-center gap-2">
                <span className="flex items-center">
                  <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(score.hmd)} />
                </span>
                <span className="text-muted-foreground text-xs">{score.hmd ?? "Unknown device"}</span>
              </div>
            </div>
            <ScoreSaberScoreDisplay
              score={score}
              leaderboard={leaderboard}
              beatSaverMap={scoreToken.beatSaver}
              settings={{
                hideDetailsDropdown: true,
              }}
            />
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
  const [scores, setScores] = useState<PlayerScore<ScoreSaberScore>[]>([]);

  const onMessage = useCallback((event: WebSocketEventMap["message"]) => {
    if (typeof event.data !== "string") {
      return;
    }
    let parsed: PlayerScore<ScoreSaberScore>;
    try {
      parsed = JSON.parse(event.data) as PlayerScore<ScoreSaberScore>;
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

  const { readyState } = useWebSocket<PlayerScore<ScoreSaberScore>>(
    `${env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/score`,
    {
      reconnectAttempts: 10,
      reconnectInterval: 3000,
      shouldReconnect: () => true,
      onMessage,
    }
  );

  const phase = getFeedPhase(readyState, scores);

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle
        title="Live Scores"
        description={<>New scores from ScoreSaber appear here as they are submitted.</>}
        actions={<FeedConnectionStatus readyState={readyState} />}
      />
      <FeedBody phase={phase} />
    </div>
  );
}
