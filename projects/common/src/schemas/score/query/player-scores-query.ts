import { Type, type StaticDecode } from "@sinclair/typebox";
import { HmdSchema } from "../../../hmds";

const PlayerIdsSchema = Type.Transform(
  Type.Union([Type.String(), Type.Array(Type.String()), Type.Undefined()])
)
  .Decode((v): string[] | undefined =>
    v === undefined ? undefined : typeof v === "string" ? v.split(",") : v
  )
  .Encode(v => v);

export const PlayerScoresQuerySchema = Type.Object({
  search: Type.Optional(Type.String()),
  hmd: Type.Optional(HmdSchema),
  playerIds: Type.Optional(PlayerIdsSchema),
});
export type PlayerScoresQuery = StaticDecode<typeof PlayerScoresQuerySchema>;
