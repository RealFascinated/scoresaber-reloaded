import { Type, type StaticDecode } from "@sinclair/typebox";
import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";

export const MiniRankingResponseSchema = Type.Object({
  /**
   * The global rankings of the player.
   */
  globalRankings: Type.Array(Type.Unsafe<ScoreSaberPlayer>(Type.Unknown())),

  /**
   * The country rankings of the player.
   */
  countryRankings: Type.Array(Type.Unsafe<ScoreSaberPlayer>(Type.Unknown())),
});

export type MiniRankingResponse = StaticDecode<typeof MiniRankingResponseSchema>;
