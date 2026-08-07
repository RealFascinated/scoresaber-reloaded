import { Type, type StaticDecode } from "@sinclair/typebox";
import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";

export const PlayerSearchResponseSchema = Type.Object({
  players: Type.Array(Type.Unsafe<ScoreSaberPlayer>(Type.Unknown())),
});

export type PlayerSearchResponse = StaticDecode<typeof PlayerSearchResponseSchema>;
