import { env } from "../env";
import { getMinioBucketName, MinioBucket } from "../minio-buckets";
import { AdditionalScoreData } from "../model/additional-score-data/additional-score-data";

/**
 * Get the URL of a BeatLeader replay.
 *
 * @param additionalData the additional score data
 * @returns the URL of the replay
 */
export function getBeatLeaderReplayUrl(additionalData: AdditionalScoreData): string | undefined {
  if (additionalData.savedReplay) {
    return `${env.NEXT_PUBLIC_CDN_URL}/${getMinioBucketName(MinioBucket.BeatLeaderReplays)}/${getBeatLeaderReplayId(additionalData)}`;
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
