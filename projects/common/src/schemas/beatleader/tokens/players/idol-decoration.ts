import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderSongSchema } from "../score/song";

/**
 * Raw `IdolDecoration` token mirroring the upstream `IdolDecoration` schema.
 */
export const BeatLeaderIdolDecorationSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  globallyAvailable: Type.Boolean(),
  smallPictureRegular: Type.String(),
  bigPictureRegular: Type.String(),
  smallPicturePro: Type.String(),
  bigPicturePro: Type.String(),
  description: Type.String(),
  songId: Type.Union([Type.String(), Type.Null()]),
  song: Type.Union([BeatLeaderSongSchema, Type.Null()]),
});

export type BeatLeaderIdolDecorationToken = StaticDecode<typeof BeatLeaderIdolDecorationSchema>;
