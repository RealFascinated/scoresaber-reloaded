import { isProduction } from "./utils/utils";

export enum MinioBucket {
  BeatLeaderScoreStats = "beatleader-score-stats",
}

/**
 * Returns the name of the Minio bucket.
 *
 * @param bucket the bucket to get the name of
 */
export function getMinioBucketName(bucket: MinioBucket) {
  return bucket + (isProduction() ? "" : "-dev");
}
