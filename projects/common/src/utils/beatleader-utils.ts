import { env } from "../env";
import { NotFoundError } from "../error/not-found-error";
import { getS3BucketName, StorageBucket } from "../minio-buckets";
import { BeatLeaderScore } from "../schemas/beatleader/score/score";

/**
 * Get the redirect URL of a BeatLeader replay.
 *
 * @param score the score data
 * @returns the URL of the replay
 */
export function getBeatLeaderReplayRedirectUrl(score: BeatLeaderScore): string | undefined {
  if (score.savedReplay) {
    return `${env.NEXT_PUBLIC_API_URL}/beatleader/replay/${score.scoreId}.bsor`;
  }
  return undefined;
}

/**
 * Get the saved replay ID of a BeatLeader replay.
 *
 * @param score the additional score data
 * @returns the ID of the replay
 */
export function getBeatLeaderReplayId(beatLeaderScore: BeatLeaderScore): string {
  return `${beatLeaderScore.scoreId}-${beatLeaderScore.playerId}-${beatLeaderScore.difficulty}-${beatLeaderScore.characteristic}-${beatLeaderScore.songHash.toUpperCase()}.bsor`;
}

/**
 * Get the CDN URL of a BeatLeader replay.
 *
 * @param beatLeaderScore the BeatLeader score data
 * @returns the CDN URL of the replay
 */
export function getBeatLeaderReplayCdnUrl(beatLeaderScore: BeatLeaderScore): string {
  if (beatLeaderScore.savedReplay) {
    return `${env.NEXT_PUBLIC_CDN_URL}/${getS3BucketName(StorageBucket.BeatLeaderReplays)}/${getBeatLeaderReplayId(beatLeaderScore)}`;
  }
  throw new NotFoundError(`No saved replay found for ${beatLeaderScore.scoreId}`);
}
