import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { normalizeModifiers } from "@ssr/common/score/modifier";
import { ScoreSaberMedalScoreRow } from "../schema";

/**
 * Converts a ScoreSaberMedalScoreRow to a ScoreSaberMedalScore.
 *
 * Rank and medals are not stored on the row; callers should set them when context is known
 * (e.g. from leaderboard placement).
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberMedalScore
 */
export function scoreSaberMedalScoreRowToType(row: ScoreSaberMedalScoreRow): ScoreSaberMedalScore {
  return {
    playerId: row.playerId,
    leaderboardId: row.leaderboardId,
    scoreId: row.scoreId,
    difficulty: MapDifficultySchema.parse(row.difficulty),
    characteristic: MapCharacteristicSchema.parse(row.characteristic),
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
