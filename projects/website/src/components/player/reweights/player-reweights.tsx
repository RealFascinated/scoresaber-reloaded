"use client";

import { cn } from "@/common/utils";
import Card from "@/components/card";
import { formatPpDelta, formatReweightDate, getDeltaClass } from "@/components/reweight/reweight-format";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import { Spinner } from "@/components/spinner";
import { SharedIcons } from "@/shared-icons";
import type { PlayerReweight } from "@ssr/common/schemas/reweight/reweight";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

function ReweightScores({ playerId, reweightId }: { playerId: string; reweightId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["player-reweight-scores", playerId, reweightId, page],
    queryFn: () => ssrApi.getPlayerReweightScores(playerId, reweightId, page),
    placeholderData: previous => previous,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-muted-foreground py-2 text-xs">Failed to load the score changes.</p>;
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      {data.items.map(score => (
        <SimpleLink
          key={score.scoreId}
          href={`/leaderboard/${score.leaderboardId}`}
          className="hover:bg-accent/40 flex items-center justify-between gap-3 rounded-md px-2 py-1 text-xs transition-colors"
        >
          <span className="min-w-0 truncate">
            {[score.songName, score.songSubName].filter(Boolean).join(" ")}
            <span className="text-muted-foreground"> · {score.levelAuthorName}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 tabular-nums">
            <span className="text-muted-foreground">
              {formatPp(score.ppBefore)}pp {"->"} {formatPp(score.ppAfter)}pp
            </span>
            <span className={cn("w-20 text-right font-semibold", getDeltaClass(score.ppDelta))}>
              {formatPpDelta(score.ppDelta)}
            </span>
          </span>
        </SimpleLink>
      ))}
      <SimplePagination
        page={page}
        totalItems={data.metadata.totalItems}
        itemsPerPage={data.metadata.itemsPerPage}
        loadingPage={isFetching ? page : undefined}
        onPageChange={setPage}
      />
    </div>
  );
}

function ReweightRow({ playerId, entry }: { playerId: string; entry: PlayerReweight }) {
  const [open, setOpen] = useState(false);
  const { reweight } = entry;

  return (
    <div className="border-border/50 border-b py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(previous => !previous)}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} score changes for ${reweight.name}`}
          className="hover:bg-accent/40 cursor-pointer rounded-md p-1"
        >
          {open ? (
            <SharedIcons.ExpandPlayerStatsIcon className="size-4" />
          ) : (
            <SharedIcons.OpenScorePageIcon className="size-4" />
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <SimpleLink
            href={`/reweights/${reweight.id}`}
            className="hover:text-primary truncate text-sm font-medium transition-colors"
          >
            {reweight.name}
          </SimpleLink>
          <span className="text-muted-foreground text-xs">
            {formatReweightDate(reweight)} · {formatNumberWithCommas(entry.scoresChanged)}{" "}
            {entry.scoresChanged === 1 ? "score" : "scores"} changed
          </span>
        </div>
        <div className="flex flex-col items-end tabular-nums">
          <span className={cn("text-sm font-semibold", getDeltaClass(entry.ppDelta))}>
            {formatPpDelta(entry.ppDelta)}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatPp(entry.ppBefore)}pp {"->"} {formatPp(entry.ppAfter)}pp
          </span>
        </div>
      </div>
      {open && <ReweightScores playerId={playerId} reweightId={reweight.id} />}
    </div>
  );
}

/**
 * The reweights that changed a player's pp. Renders nothing for players without any.
 */
export default function PlayerReweights({ playerId }: { playerId: string }) {
  const { data } = useQuery({
    queryKey: ["player-reweights", playerId],
    queryFn: () => ssrApi.getPlayerReweights(playerId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">Reweights</h2>
      <p className="text-muted-foreground mb-2 text-xs">
        How each reweight changed this player&apos;s pp, based on the scores we track.
      </p>
      {data.map(entry => (
        <ReweightRow key={entry.reweight.id} playerId={playerId} entry={entry} />
      ))}
    </Card>
  );
}
