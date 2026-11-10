export enum StorageBucket {
  BeatLeaderReplays = "ssr-beatleader-replays",
  BeatLeaderScoreStats = "ssr-beatleader-score-stats",
}

export function getS3BucketName(bucket: StorageBucket) {
  return bucket;
}
