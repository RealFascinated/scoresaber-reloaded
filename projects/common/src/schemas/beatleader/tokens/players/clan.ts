import { Type, type StaticDecode } from "@sinclair/typebox";

export const BeatLeaderClanSchema = Type.Object({
  id: Type.Number(),
  tag: Type.String(),
  color: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Union([Type.String(), Type.Null()]),
});

export type BeatLeaderClanToken = StaticDecode<typeof BeatLeaderClanSchema>;
