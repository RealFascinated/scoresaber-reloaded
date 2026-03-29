import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { normalizeModifiers } from "@ssr/common/score/modifier";
import { ScoreSaberScoreHistoryRow, ScoreSaberScoreRow, scoreSaberScoresTable } from "../schema";

/**
 * Converts a ScoreSaberScoreRow to a ScoreSaberScore.
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberScore
 */
export function scoreSaberScoreRowToType(
  row: ScoreSaberScoreRow | ScoreSaberScoreHistoryRow
): ScoreSaberScore {
  return {
    playerId: row.playerId,
    leaderboardId: row.leaderboardId,
    scoreId: row.scoreId,
    difficulty: MapDifficultySchema.parse(row.difficulty, { reportInput: true }),
    characteristic: MapCharacteristicSchema.parse(row.characteristic, { reportInput: true }),
    score: row.score,
    accuracy: row.accuracy,
    pp: row.pp,
    weight: 0,
    rank: -1,
    misses: row.missedNotes + row.badCuts,
    missedNotes: row.missedNotes,
    badCuts: row.badCuts,
    maxCombo: row.maxCombo,
    fullCombo: row.fullCombo,
    modifiers: normalizeModifiers(row.modifiers ?? []),
    playerInfo: null,
    hmd: row.hmd ?? null,
    rightController: row.rightController ?? null,
    leftController: row.leftController ?? null,
    timestamp: row.timestamp,
  };
}

export type ScoreSaberScoreInsert = typeof scoreSaberScoresTable.$inferInsert;

/**
 * Maps a parsed API score to a Drizzle insert row for `scoresaber-scores`.
 */
export function scoreSaberScoreTypeToInsert(score: ScoreSaberScore): ScoreSaberScoreInsert {
  const modifiers = score.modifiers.map(m => m.toString());
  return {
    scoreId: score.scoreId,
    playerId: score.playerId,
    leaderboardId: score.leaderboardId,
    difficulty: score.difficulty,
    characteristic: score.characteristic,
    score: score.score,
    accuracy: score.accuracy,
    pp: score.pp,
    missedNotes: score.missedNotes,
    badCuts: score.badCuts,
    maxCombo: score.maxCombo,
    fullCombo: score.fullCombo,
    modifiers: modifiers.length > 0 ? modifiers : null,
    hmd: score.hmd,
    rightController: score.rightController,
    leftController: score.leftController,
    timestamp: score.timestamp,
  };
}
