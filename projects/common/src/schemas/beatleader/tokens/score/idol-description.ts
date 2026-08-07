import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `IdolDescription` token mirroring the upstream `IdolDescription` schema.
 */
export const BeatLeaderIdolDescriptionSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  bonus: Type.Boolean(),
  globallyAvailable: Type.Boolean(),
  birthday: Type.Number(),
  smallPictureRegular: Type.String(),
  bigPictureRegular: Type.String(),
  smallPicturePro: Type.String(),
  bigPicturePro: Type.String(),
  description: Type.String(),
  rewardGif: Type.Union([Type.String(), Type.Null()]),
});

export type BeatLeaderIdolDescriptionToken = StaticDecode<typeof BeatLeaderIdolDescriptionSchema>;
