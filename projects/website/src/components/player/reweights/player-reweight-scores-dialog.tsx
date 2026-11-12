"use client";

import { cn } from "@/common/utils";
import { formatPpDelta, getDeltaClass } from "@/components/reweight/reweight-format";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SharedIcons } from "@/shared-icons";
import type { PlayerReweight } from "@ssr/common/schemas/reweight/reweight";
import { formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

type PlayerReweightScoresDialogProps = {
  playerId: string;
  /** The reweight whose scores to show; the dialog is closed while this is undefined. */
  entry: PlayerReweight | undefined;
  onClose: () => void;
};

function PlayerReweightScores({ playerId, reweightId }: { playerId: string; reweightId: number }) {
  const scores = useQuery({
    queryKey: ["player-reweight-scores", playerId, reweightId],
    queryFn: () => ssrApi.getPlayerReweightScores(playerId, reweightId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  // Used for the star change of each score's map
  const reweight = useQuery({
    queryKey: ["reweight", reweightId],
    queryFn: () => ssrApi.getReweight(reweightId),
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
    return <p className="text-muted-foreground py-4 text-sm">Failed to load the score changes.</p>;
  }

  const starChanges = new Map(
    (reweight.data?.leaderboards ?? []).map(leaderboard => [leaderboard.leaderboardId, leaderboard])
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex min-h-0 scrollbar-none flex-col overflow-y-auto overscroll-contain">
        {scores.data.map(score => {
          const starChange = starChanges.get(score.leaderboardId);
          return (
            <div
              key={score.scoreId}
              className="border-border/50 flex items-center gap-3 border-b py-2 last:border-b-0"
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
                <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs tabular-nums max-sm:hidden">
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
                <span className="text-muted-foreground text-xs">
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
 * Every score of a player that a reweight changed, with its pp and star change.
 */
export function PlayerReweightScoresDialog({ playerId, entry, onClose }: PlayerReweightScoresDialogProps) {
  return (
    <Dialog open={entry !== undefined} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle>{entry.reweight.name}</DialogTitle>
              <DialogDescription>
                {entry.scoresChanged} {entry.scoresChanged === 1 ? "score" : "scores"} changed,{" "}
                {formatPpDelta(entry.ppDelta)} in total.{" "}
                <SimpleLink href={`/reweights/${entry.reweight.id}`} className="text-primary hover:underline">
                  View reweight
                </SimpleLink>
              </DialogDescription>
            </DialogHeader>
            <PlayerReweightScores playerId={playerId} reweightId={entry.reweight.id} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
