import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `RichPresence` token mirroring the upstream `RichPresence` schema.
 * `activityStatus` is serialized as a number by the API even though the
 * generated OpenAPI documents it as a string.
 */
export const BeatLeaderRichPresenceSchema = Type.Object({
  id: Type.Number(),
  activityStatus: Type.Number(),
});

export type BeatLeaderRichPresenceToken = StaticDecode<typeof BeatLeaderRichPresenceSchema>;
