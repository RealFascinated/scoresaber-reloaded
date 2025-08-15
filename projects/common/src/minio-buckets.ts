export enum MinioBucket {
  BeatLeaderReplays = "ssr-beatleader-replays",
  Avatars = "ssr-avatars",
  MapArtwork = "ssr-map-artwork",
}

/**
 * Returns the name of the Minio bucket.
 *
 * @param bucket the bucket to get the name of
 */
export function getMinioBucketName(bucket: MinioBucket) {
  return bucket;
}
