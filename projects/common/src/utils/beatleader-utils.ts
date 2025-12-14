import { ScoreSaberScore } from "src/model/score/impl/scoresaber-score";
import { env } from "../env";
import { NotFoundError } from "../error/not-found-error";
import { getMinioBucketName, MinioBucket } from "../minio-buckets";
import { AdditionalScoreData } from "../model/additional-score-data/additional-score-data";

/**
 * Get the redirect URL of a BeatLeader replay.
 *
 * @param additionalData the additional score data
 * @returns the URL of the replay
 */
export function getBeatLeaderReplayRedirectUrl(score: ScoreSaberScore): string | undefined {
  if (score.additionalData && score.additionalData.savedReplay && score.isPreviousScore) {
    return `${env.NEXT_PUBLIC_API_URL}/replay/${score.additionalData?.scoreId}.bsor`;
  }
  return undefined;
}

/**
 * Get the saved replay ID of a BeatLeader replay.
 *
 * @param score the additional score data
 * @returns the ID of the replay
 */
export function getBeatLeaderReplayId(score: AdditionalScoreData): string {
  return `${score.scoreId}-${score.playerId}-${score.songDifficulty}-${score.songCharacteristic}-${score.songHash.toUpperCase()}.bsor`;
}

/**
 * Get the CDN URL of a BeatLeader replay.
 *
 * @param additionalData the additional score data
 * @returns the CDN URL of the replay
 */
export function getBeatLeaderReplayCdnUrl(additionalData: AdditionalScoreData): string {
  if (additionalData.savedReplay) {
    return `${env.NEXT_PUBLIC_CDN_URL}/${getMinioBucketName(MinioBucket.BeatLeaderReplays)}/${getBeatLeaderReplayId(additionalData)}`;
  }
  throw new NotFoundError(`No saved replay found for ${additionalData.scoreId}`);
}
