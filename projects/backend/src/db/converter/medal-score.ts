import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { normalizeModifiers } from "@ssr/common/score/modifier";
import { ScoreSaberMedalScoreRow } from "../schema";

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
    scoreId: row.scoreId,
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
 * Converts a live {@link ScoreSaberScore} into a {@link ScoreSaberMedalScore} for in-memory medal
 * recomputation (medals/rank are set by the caller).
 */
export function scoreSaberScoreToMedalScore(score: ScoreSaberScore): ScoreSaberMedalScore {
  return {
    playerId: score.playerId,
    leaderboardId: score.leaderboardId,
    scoreId: score.scoreId,
    difficulty: MapDifficultySchema.parse(String(score.difficulty), { reportInput: true }),
    characteristic: MapCharacteristicSchema.parse(String(score.characteristic), { reportInput: true }),
    score: score.score,
    accuracy: score.accuracy,
    medals: 0,
    rank: score.rank,
    misses: score.missedNotes + score.badCuts,
    missedNotes: score.missedNotes,
    badCuts: score.badCuts,
    maxCombo: score.maxCombo,
    fullCombo: score.fullCombo,
    modifiers: normalizeModifiers(score.modifiers),
    hmd: score.hmd ?? null,
    rightController: score.rightController,
    leftController: score.leftController,
    playerInfo: score.playerInfo ?? null,
    beatLeaderScore: score.beatLeaderScore,
    previousScore: score.previousScore,
    timestamp: score.timestamp,
  };
}