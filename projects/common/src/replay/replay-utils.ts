import { CutDistribution, DecodedReplayResponse, SwingSpeed } from "../types/decoded-replay-response";
import { NoteCutInfo, Replay, ReplayDecoder } from "./replay-decoder";

type IntervalSwingAgg = {
  rightSum: number;
  rightCount: number;
  leftSum: number;
  leftCount: number;
};

/**
 * Computes cut distribution, swing speed, and max event time in one pass over notes.
 */
function computeReplayDerivedData(replay: Replay): {
  cutDistribution: CutDistribution[];
  swingSpeed: SwingSpeed;
  replayLengthSeconds: number;
} {
  const scoreCounts = new Map<number, number>();
  const swingByInterval = new Map<number, IntervalSwingAgg>();

  let maxEventTime = 0;

  for (const note of replay.notes) {
    if (note.eventTime > maxEventTime) {
      maxEventTime = note.eventTime;
    }

    if (note.noteCutInfo && (note.eventType === 0 || note.eventType === 1)) {
      const distanceToCenterScore = getDistanceToCenterScore(note.noteCutInfo);
      scoreCounts.set(distanceToCenterScore, (scoreCounts.get(distanceToCenterScore) || 0) + 1);
    }

    if (note.noteCutInfo) {
      const interval = Math.floor(note.eventTime / 2);
      if (interval >= 0) {
        let agg = swingByInterval.get(interval);
        if (!agg) {
          agg = { rightSum: 0, rightCount: 0, leftSum: 0, leftCount: 0 };
          swingByInterval.set(interval, agg);
        }
        if (note.noteCutInfo.saberType === 0) {
          agg.rightSum += note.noteCutInfo.saberSpeed;
          agg.rightCount++;
        } else if (note.noteCutInfo.saberType === 1) {
          agg.leftSum += note.noteCutInfo.saberSpeed;
          agg.leftCount++;
        }
      }
    }
  }

  const rows = Array.from(scoreCounts.entries()).map(([score, count]) => ({ score, count }));
  rows.sort((a, b) => a.score - b.score);

  const seconds = Math.ceil(maxEventTime);
  const twoSecondIntervals = Math.ceil(seconds / 2);

  const rightSwingSpeed: number[] = [];
  const leftSwingSpeed: number[] = [];

  for (let interval = 0; interval <= twoSecondIntervals; interval++) {
    const agg = swingByInterval.get(interval);
    if (agg) {
      rightSwingSpeed.push(agg.rightCount > 0 ? agg.rightSum / agg.rightCount : 0);
      leftSwingSpeed.push(agg.leftCount > 0 ? agg.leftSum / agg.leftCount : 0);
    } else {
      rightSwingSpeed.push(0);
      leftSwingSpeed.push(0);
    }
  }

  return {
    cutDistribution: rows,
    swingSpeed: { rightSwingSpeed, leftSwingSpeed },
    replayLengthSeconds: maxEventTime,
  };
}

/**
 * Gets the decoded replay for a given query
 *
 * @param query the query to get the replay for
 * @returns the decoded replay
 */
export async function getDecodedReplay(query: string): Promise<DecodedReplayResponse> {
  const replay = await ReplayDecoder.decodeReplay(query);
  const { cutDistribution, swingSpeed, replayLengthSeconds } = computeReplayDerivedData(replay);
  return {
    rawReplay: replay,
    cutDistribution,
    swingSpeed,
    replayLengthSeconds,
  };
}

/**
 * Calculates the cut score for a given note cut info
 *
 * @param cutInfo the note cut info to calculate the cut score for
 * @returns the calculated cut score
 */
export function getCutScore(cutInfo: NoteCutInfo): number {
  // According to BSOR documentation:
  // beforeCutRating: 1 means 70 score (uncapped, can go over 1)
  const approachScore = Math.max(0, Math.min(70, cutInfo.beforeCutRating * 70));

  // afterCutRating: 1 means 30 score (uncapped, can go over 1)
  const followThroughScore = Math.max(0, Math.min(30, cutInfo.afterCutRating * 30));

  // cutDistanceToCenter: 15 * (1 - Clamp01(cutDistanceToCenter / 0.3f))
  const centerCutScore = Math.max(0, Math.min(15, 15 * (1 - Math.min(1, cutInfo.cutDistanceToCenter / 0.3))));

  const totalCutScore = Math.round(approachScore + followThroughScore + centerCutScore);
  return Math.max(0, Math.min(115, totalCutScore));
}

/**
 * Calculates only the distance to center score for a given note cut info
 *
 * @param cutInfo the note cut info to calculate the distance to center score for
 * @returns the calculated distance to center score (0-15)
 */
export function getDistanceToCenterScore(cutInfo: NoteCutInfo): number {
  // cutDistanceToCenter: 15 * (1 - Clamp01(cutDistanceToCenter / 0.3f))
  const centerCutScore = Math.max(0, Math.min(15, 15 * (1 - Math.min(1, cutInfo.cutDistanceToCenter / 0.3))));

  return Math.round(centerCutScore);
}
