import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `Badge` token mirroring the upstream `Badge` schema. The upstream
 * `player` reference (a full `Player`) is recursive and is omitted.
 */
export const BeatLeaderBadgeSchema = Type.Object({
  id: Type.Number(),
  description: Type.String(),
  details: Type.Union([Type.String(), Type.Null()]),
  image: Type.String(),
  link: Type.Union([Type.String(), Type.Null()]),
  timeset: Type.Number(),
  hidden: Type.Boolean(),
  priority: Type.Number(),
  playerId: Type.Union([Type.String(), Type.Null()]),
});

export type BeatLeaderBadgeToken = StaticDecode<typeof BeatLeaderBadgeSchema>;
