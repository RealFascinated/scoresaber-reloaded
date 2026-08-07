import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `PatreonFeatures` token mirroring the upstream `PatreonFeatures` schema.
 */
export const BeatLeaderPatreonFeaturesSchema = Type.Object({
  id: Type.Number(),
  bio: Type.String(),
  message: Type.String(),
  leftSaberColor: Type.String(),
  rightSaberColor: Type.String(),
});

export type BeatLeaderPatreonFeaturesToken = StaticDecode<typeof BeatLeaderPatreonFeaturesSchema>;
