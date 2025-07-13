import { DecodedReplayResponse } from "../types/decoded-replay-response";
import { Replay, ReplayDecoder } from "./replay-decoder";

/**
 * Gets the decoded replay for a given query
 *
 * @param query the query to get the replay for
 * @returns the decoded replay
 */
export async function getDecodedReplay(query: string): Promise<DecodedReplayResponse> {
  const replay = await ReplayDecoder.decodeReplay(query);
  const cutDistribution = getCutDistribution(replay);
  return {
    rawReplay: replay,
    cutDistribution,
  };
}

/**
 * Gets the cut distribution for a given replay
 *
 * @param replay the replay to get the cut distribution for
 * @returns the cut distribution
 */
function getCutDistribution(replay: Replay): { score: number; count: number }[] {
  const scoreCounts = new Map<number, number>();

  // Filter notes that have cut info (good/bad cuts)
  const cutNotes = replay.notes.filter(
    note => note.noteCutInfo && (note.eventType === 0 || note.eventType === 1)
  );

  // Calculate scores according to Beat Saber's actual scoring system
  for (const note of cutNotes) {
    const cutInfo = note.noteCutInfo!;

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
    const finalScore = Math.max(0, Math.min(115, totalCutScore));

    // Aggregate scores by incrementing the count for each score value
    scoreCounts.set(finalScore, (scoreCounts.get(finalScore) || 0) + 1);
  }

  // Convert map to array and sort by score
  return Array.from(scoreCounts.entries())
    .map(([score, count]) => ({ score, count }))
    .sort((a, b) => a.score - b.score);
}
