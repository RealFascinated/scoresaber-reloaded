"use client";

import { cn } from "@/common/utils";
import { formatPpDelta, getDeltaClass } from "@/components/ranked-batch/ranked-batch-format";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SharedIcons } from "@/shared-icons";
import type { PlayerRankedBatch } from "@ssr/common/schemas/ranked-batch/ranked-batch";
import { formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

type PlayerRankedBatchScoresDialogProps = {
  playerId: string;
  /** The ranked batch whose scores to show; the dialog is closed while this is undefined. */
  entry: PlayerRankedBatch | undefined;
  onClose: () => void;
};

function PlayerRankedBatchScores({ playerId, rankedBatchId }: { playerId: string; rankedBatchId: number }) {
  const scores = useQuery({
    queryKey: ["player-ranked-batch-scores", playerId, rankedBatchId],
    queryFn: () => ssrApi.getPlayerRankedBatchScores(playerId, rankedBatchId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const rankedBatch = useQuery({
    queryKey: ["rankedBatch", rankedBatchId],
    queryFn: () => ssrApi.getRankedBatch(rankedBatchId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (scores.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (scores.isError || !scores.data) {
    return <p className="py-4 text-sm text-muted-foreground">Failed to load the score changes.</p>;
  }

  const starChanges = new Map(
    (rankedBatch.data?.leaderboards ?? []).map(leaderboard => [leaderboard.leaderboardId, leaderboard])
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 pb-1.5 text-xs text-muted-foreground">
        <span className="flex-1">Score</span>
        <span className="shrink-0 max-sm:hidden">Stars</span>
        <span className="w-28 shrink-0 text-right">Raw pp</span>
      </div>
      <div className="flex min-h-0 scrollbar-none flex-col overflow-y-auto overscroll-contain">
        {scores.data.map(score => {
          const starChange = starChanges.get(score.leaderboardId);
          return (
            <div
              key={score.scoreId}
              className="flex items-center gap-3 border-b border-border/50 py-2 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <ScoreSongInfo
                  song={{
                    name: [score.songName, score.songSubName].filter(Boolean).join(" "),
                    authorName: score.songAuthorName,
                    art: getScoreSaberLeaderboardCoverUrl(score.songHash),
                  }}
                  level={{ authorName: score.levelAuthorName, difficulty: score.difficulty }}
                  imageSize={42}
                  leaderboardId={score.leaderboardId}
                  shortDiffNames
                  className="line-clamp-1"
                />
              </div>
              {starChange && (
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums max-sm:hidden">
                  <SharedIcons.QualifiedLeaderboardStarIcon className="size-3.5" />
                  <span>{starChange.previousStars.toFixed(2)}</span>
                  <SharedIcons.OpenSourceArrowIcon className="size-3" />
                  <span>{starChange.newStars === 0 ? "Unranked" : starChange.newStars.toFixed(2)}</span>
                </div>
              )}
              <div className="flex w-28 shrink-0 flex-col items-end tabular-nums">
                <span className={cn("text-sm font-semibold", getDeltaClass(score.ppDelta))}>
                  {formatPpDelta(score.ppDelta)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatPp(score.ppBefore)} {"->"} {formatPp(score.ppAfter)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Every score of a player that a ranked batch changed, with its pp and star change.
 */
export function PlayerRankedBatchScoresDialog({
  playerId,
  entry,
  onClose,
}: PlayerRankedBatchScoresDialogProps) {
  return (
    <Dialog open={entry !== undefined} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle>{entry.rankedBatch.name}</DialogTitle>
              <DialogDescription>
                {entry.scoresChanged} {entry.scoresChanged === 1 ? "score" : "scores"} changed,{" "}
                <span className={cn("font-medium", getDeltaClass(entry.ppDelta))}>
                  {formatPpDelta(entry.ppDelta)}
                </span>{" "}
                in total.{" "}
                <SimpleLink
                  href={`/ranked-batches/${entry.rankedBatch.id}`}
                  className="text-primary hover:underline"
                >
                  View ranked batch
                </SimpleLink>
                <span className="mt-1 block text-xs">The total is your weighted pp change.</span>
              </DialogDescription>
            </DialogHeader>
            <PlayerRankedBatchScores playerId={playerId} rankedBatchId={entry.rankedBatch.id} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
