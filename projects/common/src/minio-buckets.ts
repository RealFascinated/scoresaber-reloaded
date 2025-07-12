export enum MinioBucket {
  BeatLeaderReplays = "ssr-beatleader-replays",
  BeatLeaderScoreStats = "ssr-beatleader-scorestats",
  Avatars = "ssr-avatars",
  LeaderboardCoverArt = "ssr-leaderboard-cover-art",
}

/**
 * Returns the name of the Minio bucket.
 *
 * @param bucket the bucket to get the name of
 */
export function getMinioBucketName(bucket: MinioBucket) {
  return bucket;
}
