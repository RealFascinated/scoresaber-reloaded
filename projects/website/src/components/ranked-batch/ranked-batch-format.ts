import type { RankedBatch } from "@ssr/common/schemas/ranked-batch/ranked-batch";
import { formatPp } from "@ssr/common/utils/number-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { formatChange } from "@ssr/common/utils/utils";

/**
 * Formats the date of a ranked batch, e.g. "3 January 2026". Ranked Batches that were noticed over several days
 * are merged into one, so only the day it started is shown.
 */
export function formatRankedBatchDate(rankedBatch: Pick<RankedBatch, "startedAt">): string {
  return formatDate(rankedBatch.startedAt, "DD MMMM YYYY");
}

/**
 * Whether the pp changes of a ranked batch were recorded. Older ranked batches were only seeded from star history.
 */
export function hasTrackedPpChanges(rankedBatch: Pick<RankedBatch, "playerCount">): boolean {
  return rankedBatch.playerCount > 0;
}

/**
 * Whether the pp changes of a ranked batch are still being calculated. Only meaningful while nothing is tracked yet.
 */
export function isPpPending(rankedBatch: Pick<RankedBatch, "playerCount" | "ppPending">): boolean {
  return rankedBatch.ppPending && !hasTrackedPpChanges(rankedBatch);
}

/**
 * The text shown for a ranked batch whose pp changes are not available.
 */
export function getMissingPpText(rankedBatch: Pick<RankedBatch, "playerCount" | "ppPending">): string {
  return isPpPending(rankedBatch) ? "pp changes are being calculated" : "pp changes were not tracked";
}

/**
 * The colour class of a pp or star change: green for gains, red for losses, muted for no change.
 */
export function getDeltaClass(delta: number): string {
  if (delta > 0) {
    return "text-success";
  }
  return delta < 0 ? "text-danger" : "text-muted-foreground";
}

/**
 * Formats a pp change with its sign, e.g. "+12.50pp". A change of 0 is shown as "0.00pp".
 */
export function formatPpDelta(delta: number): string {
  return formatChange(delta, undefined, true) ?? `${formatPp(0)}pp`;
}
