import {
  CutDistribution,
  DecodedReplayResponse,
  SwingSpeed,
} from "../types/decoded-replay-response";
import { NoteCutInfo, Replay, ReplayDecoder } from "./replay-decoder";

/**
 * Gets the decoded replay for a given query
 *
 * @param query the query to get the replay for
 * @returns the decoded replay
 */
export async function getDecodedReplay(query: string): Promise<DecodedReplayResponse> {
  const replay = await ReplayDecoder.decodeReplay(query);
  return {
    rawReplay: replay,
    cutDistribution: getCutDistribution(replay),
    swingSpeed: getSwingSpeed(replay),
    replayLengthSeconds: Math.max(...replay.notes.map(note => note.eventTime)),
  };
}

/**
 * Gets the cut distribution for a given replay
 *
 * @param replay the replay to get the cut distribution for
 * @returns the cut distribution
 */
function getCutDistribution(replay: Replay): CutDistribution[] {
  const scoreCounts = new Map<number, number>();

  // Filter notes that have cut info (good/bad cuts)
  const cutNotes = replay.notes.filter(
    note => note.noteCutInfo && (note.eventType === 0 || note.eventType === 1)
  );

  for (const note of cutNotes) {
    // Calculate only the distance to center score (0-15)
    const distanceToCenterScore = getDistanceToCenterScore(note.noteCutInfo!);
    scoreCounts.set(distanceToCenterScore, (scoreCounts.get(distanceToCenterScore) || 0) + 1);
  }

  return Array.from(scoreCounts.entries())
    .map(([score, count]) => ({ score, count }))
    .sort((a, b) => a.score - b.score);
}

/**
 * Calculates the cut score for a given note cut info
 *
 * @param cutInfo the note cut info to calculate the score for
 * @returns the calculated cut score
 */
export function getCutScore(cutInfo: NoteCutInfo): number {
  // According to BSOR documentation:
  // beforeCutRating: 1 means 70 score (uncapped, can go over 1)
  const approachScore = Math.max(0, Math.min(70, cutInfo.beforeCutRating * 70));

  // afterCutRating: 1 means 30 score (uncapped, can go over 1)
  const followThroughScore = Math.max(0, Math.min(30, cutInfo.afterCutRating * 30));

  // cutDistanceToCenter: 15 * (1 - Clamp01(cutDistanceToCenter / 0.3f))
  const centerCutScore = Math.max(
    0,
    Math.min(15, 15 * (1 - Math.min(1, cutInfo.cutDistanceToCenter / 0.3)))
  );

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
  const centerCutScore = Math.max(
    0,
    Math.min(15, 15 * (1 - Math.min(1, cutInfo.cutDistanceToCenter / 0.3)))
  );

  return Math.round(centerCutScore);
}

/**
 * Gets the swing speed per hand for a given replay
 *
 * @param replay the replay to get the swing speed for
 * @returns the swing speed
 */
function getSwingSpeed(replay: Replay): SwingSpeed {
  const rightSwingSpeed: number[] = [];
  const leftSwingSpeed: number[] = [];

  // Calculate replay length in seconds
  const replayLengthSeconds = Math.max(...replay.notes.map(note => note.eventTime));
  const seconds = Math.ceil(replayLengthSeconds);
  const twoSecondIntervals = Math.ceil(seconds / 2);

  // Initialize arrays for each 2-second interval
  for (let interval = 0; interval <= twoSecondIntervals; interval++) {
    rightSwingSpeed.push(0);
    leftSwingSpeed.push(0);
  }

  // Track count of swings per 2-second interval for averaging
  const rightSwingCount: number[] = new Array(twoSecondIntervals + 1).fill(0);
  const leftSwingCount: number[] = new Array(twoSecondIntervals + 1).fill(0);

  for (const note of replay.notes) {
    if (note.noteCutInfo) {
      const interval = Math.floor(note.eventTime / 2);
      if (interval >= 0 && interval <= twoSecondIntervals) {
        // 0 = right, 1 = left
        if (note.noteCutInfo.saberType === 0) {
          rightSwingSpeed[interval] += note.noteCutInfo.saberSpeed;
          rightSwingCount[interval]++;
        } else if (note.noteCutInfo.saberType === 1) {
          leftSwingSpeed[interval] += note.noteCutInfo.saberSpeed;
          leftSwingCount[interval]++;
        }
      }
    }
  }

  // Calculate averages for each 2-second interval
  for (let interval = 0; interval <= twoSecondIntervals; interval++) {
    if (rightSwingCount[interval] > 0) {
      rightSwingSpeed[interval] = rightSwingSpeed[interval] / rightSwingCount[interval];
    } else {
      rightSwingSpeed[interval] = 0;
    }

    if (leftSwingCount[interval] > 0) {
      leftSwingSpeed[interval] = leftSwingSpeed[interval] / leftSwingCount[interval];
    } else {
      leftSwingSpeed[interval] = 0;
    }
  }

  return { rightSwingSpeed, leftSwingSpeed };
}
