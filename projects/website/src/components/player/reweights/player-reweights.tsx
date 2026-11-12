"use client";

import { cn } from "@/common/utils";
import Card from "@/components/card";
import { formatPpDelta, formatReweightDate, getDeltaClass } from "@/components/reweight/reweight-format";
import type { PlayerReweight } from "@ssr/common/schemas/reweight/reweight";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlayerReweightScoresDialog } from "./player-reweight-scores-dialog";

/**
 * The reweights that changed a player's pp, in a scrollable list. Renders nothing for players without any.
 */
export default function PlayerReweights({ playerId }: { playerId: string }) {
  const [selected, setSelected] = useState<PlayerReweight | undefined>();
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
    <Card className="gap-2">
      <h2 className="text-base font-semibold">Reweights</h2>
      <div className="-mx-1 flex max-h-64 scrollbar-none flex-col overflow-y-auto overscroll-contain">
        {data.map(entry => (
          <button
            key={entry.reweight.id}
            type="button"
            onClick={() => setSelected(entry)}
            className="hover:bg-accent/40 flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left transition-colors"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{entry.reweight.name}</span>
              <span className="text-muted-foreground text-xs">
                {formatReweightDate(entry.reweight)} · {formatNumberWithCommas(entry.scoresChanged)}{" "}
                {entry.scoresChanged === 1 ? "score" : "scores"} changed
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end tabular-nums">
              <span className={cn("text-sm font-semibold", getDeltaClass(entry.ppDelta))}>
                {formatPpDelta(entry.ppDelta)}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatPp(entry.ppBefore)} {"->"} {formatPp(entry.ppAfter)}
              </span>
            </div>
          </button>
        ))}
      </div>
      <PlayerReweightScoresDialog
        playerId={playerId}
        entry={selected}
        onClose={() => setSelected(undefined)}
      />
    </Card>
  );
}
