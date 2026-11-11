import { env } from "../env";
import { getS3BucketName, StorageBucket } from "../minio-buckets";
import { BeatLeaderScore } from "../schemas/beatleader/score/score";

/**
 * Normalizes a BeatLeader timeset to unix milliseconds. BeatLeader timestamps are
 * unix seconds (e.g. `"1785890742"`); values that already look like milliseconds
 * (>= 1e12) are returned unchanged.
 *
 * @param timeset the BeatLeader timeset (unix seconds or milliseconds)
 */
export function beatLeaderTimesetToMs(timeset: string | number): number {
  const value = Number(timeset);
  return Number.isFinite(value) && value < 1e12 ? value * 1000 : value;
}

export function getBeatLeaderReplayRedirectUrl(score: BeatLeaderScore): string | undefined {
  if (score.savedReplay) {
    return `${env.NEXT_PUBLIC_API_URL}/beatleader/replay/${score.scoreId}.bsor`;
  }
  return undefined;
}

export function getBeatLeaderReplayId(beatLeaderScore: BeatLeaderScore): string {
  return `${beatLeaderScore.scoreId}-${beatLeaderScore.playerId}-${beatLeaderScore.difficulty}-${beatLeaderScore.characteristic}-${beatLeaderScore.songHash.toUpperCase()}.bsor`;
}

/**
 * Gets the URL of a score's replay file. Replays we saved are served from our own storage,
 * anything else is served from BeatLeader's replay CDN.
 *
 * @param beatLeaderScore the BeatLeader score
 * @returns the replay file URL
 */
export function getBeatLeaderReplayCdnUrl(beatLeaderScore: BeatLeaderScore): string {
  const replayId = getBeatLeaderReplayId(beatLeaderScore);
  if (beatLeaderScore.savedReplay) {
    return `${env.NEXT_PUBLIC_CDN_URL}/${getS3BucketName(StorageBucket.BeatLeaderReplays)}/${replayId}`;
  }
  return `https://cdn.replays.beatleader.xyz/${replayId}`;
}
