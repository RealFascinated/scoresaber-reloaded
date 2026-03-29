import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { normalizeModifiers } from "@ssr/common/score/modifier";
import { ScoreSaberMedalScoreRow, scoreSaberMedalScoresTable } from "../schema";

/**
 * Converts a ScoreSaberMedalScoreRow to a ScoreSaberMedalScore.
 *
 * Rank is not stored on the row; callers should set it when context is known
 * (e.g. from leaderboard placement).
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberMedalScore
 */
export function scoreSaberMedalScoreRowToType(row: ScoreSaberMedalScoreRow): ScoreSaberMedalScore {
  return {
    playerId: row.playerId,
    leaderboardId: row.leaderboardId,
    scoreId: row.id,
    difficulty: MapDifficultySchema.parse(row.difficulty, { reportInput: true }),
    characteristic: MapCharacteristicSchema.parse(row.characteristic, { reportInput: true }),
    score: row.score,
    accuracy: row.accuracy,
    medals: row.medals,
    rank: 0,
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

/**
 * Maps a medal score row to {@link ScoreSaberScore} for in-memory medal recomputation (merge with live scores).
 */
export function scoreSaberMedalScoreRowToScoreSaberScore(row: ScoreSaberMedalScoreRow): ScoreSaberScore {
  return {
    playerId: row.playerId,
    leaderboardId: row.leaderboardId,
    scoreId: row.id,
    difficulty: MapDifficultySchema.parse(row.difficulty, { reportInput: true }),
    characteristic: MapCharacteristicSchema.parse(row.characteristic, { reportInput: true }),
    score: row.score,
    accuracy: row.accuracy,
    pp: 0,
    weight: 0,
    rank: 0,
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

export type ScoreSaberMedalScoreInsert = typeof scoreSaberMedalScoresTable.$inferInsert;

/**
 * Builds a Drizzle insert row for `scoresaber-medal-scores` from a score and medal count.
 */
export function scoreSaberScoreToMedalScoreInsert(
  score: ScoreSaberScore,
  medals: number
): ScoreSaberMedalScoreInsert {
  const modifiers = score.modifiers.map(modifier => modifier.toString());
  return {
    id: score.scoreId,
    playerId: score.playerId,
    leaderboardId: score.leaderboardId,
    difficulty: score.difficulty,
    characteristic: score.characteristic,
    score: score.score,
    accuracy: score.accuracy,
    medals,
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
