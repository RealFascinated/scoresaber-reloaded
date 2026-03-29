import { BeatLeaderScore } from "../../../../common/src/schemas/beatleader/score/score";
import { BeatLeaderScoreRow } from "../schema";

/**
 * Converts a BeatLeader score row to a BeatLeader score.
 *
 * @param row the row to convert
 * @returns the converted BeatLeader score
 */
export function beatLeaderScoreRowToType(row: BeatLeaderScoreRow): BeatLeaderScore {
  return {
    playerId: row.playerId,
    songHash: row.songHash,
    leaderboardId: row.leaderboardId,
    scoreId: row.id,
    pauses: row.pauses,
    fcAccuracy: row.fcAccuracy,
    fullCombo: row.fullCombo,
    handAccuracy: {
      left: row.leftHandAccuracy,
      right: row.rightHandAccuracy,
    },
    misses: {
      misses: row.misses,
      missedNotes: row.missedNotes,
      bombCuts: row.bombCuts,
      wallsHit: row.wallsHit,
      badCuts: row.badCuts,
    },
    scoreImprovement: {
      score: row.improvementScore,
      pauses: row.improvementPauses,
      misses: {
        misses: row.improvementMisses,
        missedNotes: row.improvementMissedNotes,
        bombCuts: row.improvementBombCuts,
        wallsHit: row.improvementWallsHit,
        badCuts: row.improvementBadCuts,
      },
      handAccuracy: {
        left: row.improvementLeftHandAccuracy,
        right: row.improvementRightHandAccuracy,
      },
    },
    savedReplay: row.savedReplay ?? false,
    timestamp: row.timestamp,
  };
}
