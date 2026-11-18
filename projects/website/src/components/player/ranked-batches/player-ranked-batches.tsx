"use client";

import { cn } from "@/common/utils";
import Card from "@/components/card";
import {
  formatPpDelta,
  formatRankedBatchDate,
  getDeltaClass,
} from "@/components/ranked-batch/ranked-batch-format";
import type { PlayerRankedBatch } from "@ssr/common/schemas/ranked-batch/ranked-batch";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlayerRankedBatchScoresDialog } from "./player-ranked-batch-scores-dialog";

/**
 * The ranked batches that changed a player's pp, in a scrollable list. Renders nothing for players without any.
 */
export default function PlayerRankedBatches({ playerId }: { playerId: string }) {
  const [selected, setSelected] = useState<PlayerRankedBatch | undefined>();
  const { data } = useQuery({
    queryKey: ["player-ranked-batches", playerId],
    queryFn: () => ssrApi.getPlayerRankedBatches(playerId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card className="gap-2">
      <h2 className="text-base font-semibold">Ranked Batches</h2>
      <div className="-mx-1 flex max-h-64 scrollbar-none flex-col overflow-y-auto overscroll-contain">
        {data.map(entry => (
          <button
            key={entry.rankedBatch.id}
            type="button"
            onClick={() => setSelected(entry)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{entry.rankedBatch.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatRankedBatchDate(entry.rankedBatch)} · {formatNumberWithCommas(entry.scoresChanged)}{" "}
                {entry.scoresChanged === 1 ? "score" : "scores"} changed
              </span>
            </div>
            <span className={cn("shrink-0 text-sm font-semibold tabular-nums", getDeltaClass(entry.ppDelta))}>
              {formatPpDelta(entry.ppDelta)}
            </span>
          </button>
        ))}
      </div>
      <PlayerRankedBatchScoresDialog
        playerId={playerId}
        entry={selected}
        onClose={() => setSelected(undefined)}
      />
    </Card>
  );
}
