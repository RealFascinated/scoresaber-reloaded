import { Type, type StaticDecode } from "typebox";
import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";

export const MiniRankingResponseSchema = Type.Object({
  globalRankings: Type.Array(Type.Unsafe<ScoreSaberPlayer>(Type.Unknown())),

  countryRankings: Type.Array(Type.Unsafe<ScoreSaberPlayer>(Type.Unknown())),
});

export type MiniRankingResponse = StaticDecode<typeof MiniRankingResponseSchema>;
