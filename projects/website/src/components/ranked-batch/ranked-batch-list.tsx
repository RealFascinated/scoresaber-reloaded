import SimpleLink from "@/components/simple-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RankedBatch } from "@ssr/common/schemas/ranked-batch/ranked-batch";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatRankedBatchDate, hasTrackedPpChanges, isPpPending } from "./ranked-batch-format";

function PpCount({ rankedBatch, value }: { rankedBatch: RankedBatch; value: number }) {
  if (hasTrackedPpChanges(rankedBatch)) {
    return <span className="tabular-nums">{formatNumberWithCommas(value)}</span>;
  }
  return (
    <span className="text-muted-foreground text-xs">
      {isPpPending(rankedBatch) ? "Calculating" : "Not tracked"}
    </span>
  );
}

export function RankedBatchList({ rankedBatches }: { rankedBatches: RankedBatch[] }) {
  return (
    <div className="ring-border bg-card overflow-x-auto rounded-xl ring-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ranked Batch</TableHead>
            <TableHead className="w-24 text-right">Ranked</TableHead>
            <TableHead className="w-24 text-right">Re-rated</TableHead>
            <TableHead className="w-28 text-right max-sm:hidden">Players</TableHead>
            <TableHead className="w-36 text-right whitespace-nowrap max-sm:hidden">Scores changed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankedBatches.map(rankedBatch => (
            <TableRow key={rankedBatch.id} className="relative cursor-pointer">
              <TableCell className="py-2.5">
                <div className="flex flex-col">
                  <SimpleLink
                    href={`/ranked-batches/${rankedBatch.id}`}
                    className="hover:text-primary text-sm font-medium transition-colors after:absolute after:inset-0"
                  >
                    {rankedBatch.name}
                  </SimpleLink>
                  <span className="text-muted-foreground text-xs">{formatRankedBatchDate(rankedBatch)}</span>
                </div>
              </TableCell>
              <TableCell className="py-2.5 text-right text-sm tabular-nums">
                {formatNumberWithCommas(rankedBatch.newLeaderboardCount)}
              </TableCell>
              <TableCell className="py-2.5 text-right text-sm tabular-nums">
                {formatNumberWithCommas(rankedBatch.leaderboardCount)}
              </TableCell>
              <TableCell className="py-2.5 text-right text-sm max-sm:hidden">
                <PpCount rankedBatch={rankedBatch} value={rankedBatch.playerCount} />
              </TableCell>
              <TableCell className="py-2.5 text-right text-sm max-sm:hidden">
                <PpCount rankedBatch={rankedBatch} value={rankedBatch.scoreCount} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
