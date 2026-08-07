import { Type, type StaticDecode } from "@sinclair/typebox";

export const PlayerPpsResponseSchema = Type.Object({
  scores: Type.Array(
    Type.Object({
      pp: Type.Number(),
      weight: Type.Number(),
      scoreId: Type.Number(),
    })
  ),
});
export type PlayerPpsResponse = StaticDecode<typeof PlayerPpsResponseSchema>;
