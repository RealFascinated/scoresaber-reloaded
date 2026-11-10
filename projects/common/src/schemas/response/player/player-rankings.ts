import { Type, type StaticDecode } from "typebox";
import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";
import { PaginationMetadataSchema } from "../../pagination";

export const PlayerRankingsResponseSchema = Type.Object({
  items: Type.Array(Type.Unsafe<ScoreSaberPlayer>(Type.Unknown())),
  metadata: PaginationMetadataSchema,
});

export type PlayerRankingsResponse = StaticDecode<typeof PlayerRankingsResponseSchema>;
