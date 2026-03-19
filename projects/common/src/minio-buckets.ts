export enum StorageBucket {
  BeatLeaderReplays = "ssr-beatleader-replays",
  LeaderboardSongArt = "ssr-leaderboard-song-art",
  PlayerAvatars = "ssr-player-avatars",
  BeatLeaderScoreStats = "ssr-beatleader-score-stats",
}

/**
 * Returns the name of the S3 bucket.
 *
 * @param bucket the bucket to get the name of
 */
export function getS3BucketName(bucket: StorageBucket) {
  return bucket;
}
