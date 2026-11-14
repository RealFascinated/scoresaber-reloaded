"use client";

import { cn } from "@/common/utils";
import { useRealm } from "@/components/providers/realm-provider";
import { getDeltaClass } from "@/components/reweight/reweight-format";
import SimpleLink from "@/components/simple-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

function formatStars(stars: number): string {
  return stars === 0 ? "Unranked" : stars.toFixed(2);
}

function formatStarDelta(change: LeaderboardStarChange): string {
  if (change.previousStars === 0 || change.newStars === 0) {
    return "-";
  }
  const delta = change.newStars - change.previousStars;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;
}

/** Mounted only while the dialog is open, so the history is fetched on click. */
export function LeaderboardStarChangeHistory({ leaderboardId }: { leaderboardId: number }) {
  const { realmId } = useRealm();
  const isDefaultRealm = realmId === DEFAULT_REALM_ID;

  const {
    data: starChangeHistory,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["leaderboard-star-history", leaderboardId, realmId],
    queryFn: () => ssrApi.getLeaderboardStarHistory(leaderboardId, isDefaultRealm ? undefined : realmId),
    staleTime: 60_000,
  });

  const changes = useMemo(
    () => (starChangeHistory ?? []).toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [starChangeHistory]
  );

  if (isPending) {
    return <p className="text-muted-foreground py-6 text-center text-sm">Loading star history…</p>;
  }

  if (isError) {
    return <p className="text-muted-foreground py-6 text-center text-sm">Could not load star history.</p>;
  }

  return (
    <div className="ring-border bg-card max-h-[70vh] overflow-auto rounded-xl ring-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Before</TableHead>
            <TableHead className="text-right">After</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead className="w-24 text-right max-sm:hidden">Reweight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map(change => {
            const delta = change.newStars - change.previousStars;
            return (
              <TableRow
                key={change.timestamp.getTime()}
                className={cn(change.reweightId !== undefined && "relative cursor-pointer")}
              >
                <TableCell className="py-2.5 text-sm">
                  {formatDate(change.timestamp, "DD MMMM YYYY")}
                </TableCell>
                <TableCell className="text-muted-foreground py-2.5 text-right text-sm tabular-nums">
                  {formatStars(change.previousStars)}
                </TableCell>
                <TableCell className="py-2.5 text-right text-sm font-medium tabular-nums">
                  {formatStars(change.newStars)}
                </TableCell>
                <TableCell className={cn("py-2.5 text-right text-sm tabular-nums", getDeltaClass(delta))}>
                  {formatStarDelta(change)}
                </TableCell>
                <TableCell className="py-2.5 text-right text-sm max-sm:hidden">
                  {change.reweightId !== undefined ? (
                    <SimpleLink
                      href={`/reweights/${change.reweightId}`}
                      className="text-primary hover:text-primary/80 transition-colors after:absolute after:inset-0"
                    >
                      View
                    </SimpleLink>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
