import SimpleLink from "@/components/simple-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Reweight } from "@ssr/common/schemas/reweight/reweight";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatReweightDate, hasTrackedPpChanges, isPpPending } from "./reweight-format";

function PpCount({ reweight, value }: { reweight: Reweight; value: number }) {
  if (hasTrackedPpChanges(reweight)) {
    return <span className="tabular-nums">{formatNumberWithCommas(value)}</span>;
  }
  return (
    <span className="text-muted-foreground text-xs">
      {isPpPending(reweight) ? "Calculating" : "Not tracked"}
    </span>
  );
}

export function ReweightList({ reweights }: { reweights: Reweight[] }) {
  return (
    <div className="ring-border bg-card overflow-x-auto rounded-xl ring-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reweight</TableHead>
            <TableHead className="w-24 text-right">Maps</TableHead>
            <TableHead className="w-28 text-right max-sm:hidden">Players</TableHead>
            <TableHead className="w-36 text-right whitespace-nowrap max-sm:hidden">Scores changed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reweights.map(reweight => (
            <TableRow key={reweight.id} className="relative cursor-pointer">
              <TableCell className="py-2.5">
                <div className="flex flex-col">
                  <SimpleLink
                    href={`/reweights/${reweight.id}`}
                    className="hover:text-primary text-sm font-medium transition-colors after:absolute after:inset-0"
                  >
                    {reweight.name}
                  </SimpleLink>
                  <span className="text-muted-foreground text-xs">{formatReweightDate(reweight)}</span>
                </div>
              </TableCell>
              <TableCell className="py-2.5 text-right text-sm tabular-nums">
                {formatNumberWithCommas(reweight.leaderboardCount)}
              </TableCell>
              <TableCell className="py-2.5 text-right text-sm max-sm:hidden">
                <PpCount reweight={reweight} value={reweight.playerCount} />
              </TableCell>
              <TableCell className="py-2.5 text-right text-sm max-sm:hidden">
                <PpCount reweight={reweight} value={reweight.scoreCount} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
