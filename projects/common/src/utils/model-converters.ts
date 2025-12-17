import { AdditionalScoreData } from "../model/additional-score-data/additional-score-data";
import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerHistoryEntry } from "../model/player/player-history-entry";
import { ScoreSaberMedalsScore } from "../model/score/impl/scoresaber-medals-score";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { removeObjectFields } from "../object.util";
import { convertObjectId } from "./utils";

const baseFields = ["_id", "__v"];

/**
 * Converts a database score to a ScoreSaberScore.
 *
 * @param score the score to convert
 * @returns the converted score
 */
export function scoreToObject(
  score: ScoreSaberScore | ScoreSaberMedalsScore
): ScoreSaberScore | ScoreSaberMedalsScore {
  return {
    ...removeObjectFields<ScoreSaberScore | ScoreSaberMedalsScore>(score, [...baseFields, "id"]),
    id: convertObjectId(score._id),
  } as unknown as ScoreSaberScore | ScoreSaberMedalsScore;
}

/**
 * Converts a database leaderboard to a ScoreSaberLeaderboard.
 *
 * @param leaderboard the leaderboard to convert
 * @returns the converted leaderboard
 */
export function leaderboardToObject(leaderboard: ScoreSaberLeaderboard): ScoreSaberLeaderboard {
  return {
    ...removeObjectFields<ScoreSaberLeaderboard>(leaderboard, baseFields),
    id: leaderboard.id ?? convertObjectId(leaderboard._id),
  } as ScoreSaberLeaderboard;
}

/**
 * Converts a database player history entry to a PlayerHistoryEntry.
 *
 * @param history the player history entry to convert
 * @returns the converted player history entry
 */
export function playerHistoryToObject(history: PlayerHistoryEntry): PlayerHistoryEntry {
  return {
    ...removeObjectFields<PlayerHistoryEntry>(history, [...baseFields, "playerId", "date"]),
  } as PlayerHistoryEntry;
}

/**
 * Converts a database additional score data to AdditionalScoreData.
 *
 * @param additionalData the additional score data to convert
 * @returns the converted additional score data
 */
export function additionalScoreDataToObject(
  additionalData: AdditionalScoreData
): AdditionalScoreData {
  return {
    ...removeObjectFields<AdditionalScoreData>(additionalData, baseFields),
  } as AdditionalScoreData;
}
