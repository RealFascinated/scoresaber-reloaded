import type { Reweight } from "@ssr/common/schemas/reweight/reweight";
import { formatPp } from "@ssr/common/utils/number-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { formatChange } from "@ssr/common/utils/utils";

/**
 * Formats the date of a reweight, e.g. "3 January 2026". Reweights that were noticed over several days
 * are merged into one, so only the day it started is shown.
 */
export function formatReweightDate(reweight: Pick<Reweight, "startedAt">): string {
  return formatDate(reweight.startedAt, "DD MMMM YYYY");
}

/**
 * Whether the pp changes of a reweight were recorded. Older reweights were only seeded from star history.
 */
export function hasTrackedPpChanges(reweight: Pick<Reweight, "playerCount">): boolean {
  return reweight.playerCount > 0;
}

/**
 * Whether the pp changes of a reweight are still being calculated. Only meaningful while nothing is tracked yet.
 */
export function isPpPending(reweight: Pick<Reweight, "playerCount" | "ppPending">): boolean {
  return reweight.ppPending && !hasTrackedPpChanges(reweight);
}

/**
 * The text shown for a reweight whose pp changes are not available.
 */
export function getMissingPpText(reweight: Pick<Reweight, "playerCount" | "ppPending">): string {
  return isPpPending(reweight) ? "pp changes are being calculated" : "pp changes were not tracked";
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
