import { BeatLeaderScore as OldBeatLeaderScore } from "@ssr/common/model/beatleader-score/beatleader-score";
import { BeatLeaderScore } from "../../../../../score/score";

/**
 * Converts a BeatLeader score row to a BeatLeader score.
 *
 * @param row the row to convert
 * @returns the converted BeatLeader score
 */
export function beatLeaderScoreRowToType(row: OldBeatLeaderScore): BeatLeaderScore {
  return {
    scoreId: row.scoreId,
    pauses: row.pauses,
    fcAccuracy: row.fcAccuracy,
    fullCombo: row.fullCombo,
    handAccuracy: {
      left: row.handAccuracy.left,
      right: row.handAccuracy.right,
    },
    misses: row.misses,
    scoreImprovement: {
      score: row.scoreImprovement?.score ?? 0,
      pauses: row.scoreImprovement?.pauses ?? 0,
      misses: {
        misses: row.scoreImprovement?.misses.misses ?? 0,
        missedNotes: row.scoreImprovement?.misses.missedNotes ?? 0,
        bombCuts: row.scoreImprovement?.misses.bombCuts ?? 0,
        wallsHit: row.scoreImprovement?.misses.wallsHit ?? 0,
        badCuts: row.scoreImprovement?.misses.badCuts ?? 0,
      },
    },
    savedReplay: row.savedReplay ?? false,
    timestamp: row.timestamp,
  };
}
