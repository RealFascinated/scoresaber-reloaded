"use client";

import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { ScoreAccuracyBadge } from "@/components/platform/scoresaber/score/badges/score-accuracy";
import ScoreMissesAndPausesBadge from "@/components/platform/scoresaber/score/badges/score-misses-and-pauses";
import { ScorePpBadge } from "@/components/platform/scoresaber/score/badges/score-pp";
import ScoreSaberScoreButtons from "@/components/platform/scoresaber/score/buttons/score-buttons";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badges";
import ScoreSongInfo from "@/components/score/score-song-info";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { Input } from "@/components/ui/input";
import useMe from "@/hooks/use-me";
import { usePinnedScoreMessage, usePlayerPinnedScores } from "@/hooks/use-pinned-scores";
import { SharedIcons } from "@/shared-icons";
import type { PinnedScore } from "@ssr/common/schemas/response/user/pinned-scores";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { useEffect, useRef, useState } from "react";

const pinnedBadges: ScoreBadge<ScoreSaberScore, ScoreSaberLeaderboard>[] = [
  {
    name: "Accuracy",
    color: (score, leaderboard) =>
      getScoreBadgeFromAccuracy((score.score / leaderboard.maxScore) * 100).color,
    create: score => <ScoreAccuracyBadge score={score} />,
  },
  {
    name: "PP",
    textColor: () => "var(--statistic)",
    create: (score, leaderboard) =>
      score.pp ? <ScorePpBadge score={score} leaderboard={leaderboard} /> : undefined,
  },
  {
    name: "Full Combo",
    create: score => <ScoreMissesAndPausesBadge score={score} />,
  },
];

function PinnedScoreMessage({
  playerId,
  scoreId,
  message,
  editable,
}: {
  playerId: string;
  scoreId: number;
  message?: string;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message ?? "");
  const { mutate, isPending } = usePinnedScoreMessage(playerId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }
    inputRef.current?.focus();
  }, [editing]);

  function startEditing() {
    setDraft(message ?? "");
    setEditing(true);
  }

  function save() {
    setEditing(false);
    if (draft.trim() !== (message ?? "")) {
      mutate({ scoreId, message: draft });
    }
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        disabled={isPending}
        maxLength={SHARED_CONSTS.maxPinnedScoreMessageLength}
        placeholder="Write a comment..."
        className="h-7 min-w-0 flex-1 px-2 text-sm"
        onChange={event => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={event => {
          if (event.key === "Enter") {
            save();
          } else if (event.key === "Escape") {
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <>
      <SimpleTooltip display={message ?? ""} className="min-w-0 flex-1">
      <p
        className={cn(
          "truncate text-sm",
          message ? "text-muted-foreground" : "text-muted-foreground/50 italic"
        )}
      >
        {message ?? (editable ? "No comment" : "")}
      </p>
      </SimpleTooltip>
      {editable && (
        <SimpleTooltip display="Edit comment">
          <button
            aria-label="Edit comment"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={startEditing}
          >
            <SharedIcons.EditPinnedScoreMessageIcon className="size-3.5" />
          </button>
        </SimpleTooltip>
      )}
    </>
  );
}

function PinnedScoreCard({
  playerId,
  pinned: { score, leaderboard, beatSaver, message },
  isOwnProfile,
}: {
  playerId: string;
  pinned: PinnedScore;
  isOwnProfile: boolean;
}) {
  return (
    <div
      data-ss-score-row
      className="@container flex min-w-0 flex-col gap-2 rounded-lg bg-background/40 p-2.5 ring-1 ring-border"
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <ScoreSongInfo
            song={{
              name: leaderboard.fullName,
              authorName: leaderboard.songAuthorName,
              art: leaderboard.songArt,
            }}
            level={{ authorName: leaderboard.levelAuthorName, difficulty: leaderboard.difficulty.difficulty }}
            metric={{ value: leaderboard.stars, icon: SharedIcons.DifficultyStarIcon }}
            beatSaverMap={beatSaver}
            leaderboardId={leaderboard.id}
            imageSize={64}
          >
            <div className="mt-1 flex flex-wrap items-center gap-1 [&>div]:px-2 [&>div:empty]:hidden">
              <ScoreBadges badges={pinnedBadges} score={score} leaderboard={leaderboard} />
            </div>
          </ScoreSongInfo>
        </div>
      </div>

      <div className="mt-auto flex min-w-0 items-center gap-2 border-t border-border/60 pt-2 text-xs">
        {score.rank === -1 ? null : (
          <SimpleLink
            href={`/leaderboard/${leaderboard.id}?page=${getPageFromRank(score.rank, 12)}&highlight=${score.playerId}`}
          >
            <span className={cn(getRankColor(score.rank), "hover:text-primary/80 font-bold transition-all")}>
              #{formatNumberWithCommas(score.rank)}
            </span>
          </SimpleLink>
        )}
        <div className="shrink-0 text-muted-foreground">
          <ScoreTimeSet timestamp={score.timestamp} />
        </div>
        <PinnedScoreMessage
          key={message ?? ""}
          playerId={playerId}
          scoreId={score.scoreId}
          message={message}
          editable={isOwnProfile}
        />
        <div className="shrink-0">
          <ScoreSaberScoreButtons leaderboard={leaderboard} beatSaverMap={beatSaver} score={score} />
        </div>
      </div>
    </div>
  );
}

/**
 * The scores a player pinned, shown above their other scores.
 */
export default function PinnedScores({ playerId }: { playerId: string }) {
  const { data } = usePlayerPinnedScores(playerId);
  const { data: me } = useMe();
  if (!data || data.items.length === 0) {
    return null;
  }
  const isOwnProfile = me?.playerId === playerId;

  return (
    <section className="@container flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-border">
      <h3 className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
        <SharedIcons.PinScoreIcon className="size-4" />
        Pinned Scores
      </h3>
      <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {data.items.map(pinned => (
          <PinnedScoreCard
            key={pinned.score.scoreId}
            playerId={playerId}
            pinned={pinned}
            isOwnProfile={isOwnProfile}
          />
        ))}
      </div>
    </section>
  );
}
