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
import { useState } from "react";

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

/**
 * The comment on a pinned score. The owner can open an editor with the pencil, everyone else just reads it.
 */
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
        autoFocus
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
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          message ? "text-muted-foreground" : "text-muted-foreground/50 italic"
        )}
        title={message}
      >
        {message ?? (editable ? "No comment" : "")}
      </p>
      {editable && (
        <SimpleTooltip display="Edit comment">
          <button
            aria-label="Edit comment"
            className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
            onClick={startEditing}
          >
            <SharedIcons.EditPinnedScoreMessageIcon className="size-3.5" />
          </button>
        </SimpleTooltip>
      )}
    </>
  );
}

/**
 * A compact card for one pinned score.
 */
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
      className="ring-border bg-background/40 @container flex min-w-0 flex-col gap-3 rounded-lg p-3 ring-1"
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {score.rank === -1 ? null : (
          <SimpleLink
            href={`/leaderboard/${leaderboard.id}?page=${getPageFromRank(score.rank, 12)}&highlight=${score.playerId}`}
          >
            <span className={cn(getRankColor(score.rank), "hover:text-primary/80 font-bold transition-all")}>
              #{formatNumberWithCommas(score.rank)}
            </span>
          </SimpleLink>
        )}
        <div className="text-muted-foreground shrink-0">
          <ScoreTimeSet timestamp={score.timestamp} />
        </div>
        <PinnedScoreMessage
          key={message ?? ""}
          playerId={playerId}
          scoreId={score.scoreId}
          message={message}
          editable={isOwnProfile}
        />
      </div>

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
            <div className="mt-1 flex flex-wrap gap-1 [&>div]:px-2 [&>div:empty]:hidden">
              <ScoreBadges badges={pinnedBadges} score={score} leaderboard={leaderboard} />
            </div>
          </ScoreSongInfo>
        </div>
        <ScoreSaberScoreButtons leaderboard={leaderboard} beatSaverMap={beatSaver} score={score} />
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
    <section className="ring-border bg-card @container flex flex-col gap-3 rounded-xl p-4 ring-1">
      <h3 className="text-muted-foreground flex items-center justify-center gap-2 text-sm font-semibold">
        <SharedIcons.PinScoreIcon className="size-4" />
        Pinned Scores
      </h3>
      <div className="grid grid-cols-1 gap-2 @3xl:grid-cols-2 @6xl:grid-cols-3">
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
