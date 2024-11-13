import { isProduction } from "./utils/utils";

export enum MinioBucket {
  BeatLeaderReplays = "beatleader-replays",
}

/**
 * Returns the name of the Minio bucket.
 *
 * @param bucket the bucket to get the name of
 */
export function getMinioBucketName(bucket: MinioBucket) {
  return bucket + (isProduction() ? "" : "-dev");
}
