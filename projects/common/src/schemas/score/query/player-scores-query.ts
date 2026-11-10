import { Type, type StaticDecode } from "typebox";
import { HmdSchema } from "../../../hmds";
import { SHARED_CONSTS } from "../../../shared-consts";
import { RealmIdSchema } from "../../realm/realm-query";

const maxPlayerIds = SHARED_CONSTS.maxFollowing + 1;

const PlayerIdsSchema = Type.Codec(
  Type.Refine(
    Type.Union([Type.String(), Type.Array(Type.String()), Type.Undefined()]),
    v => v === undefined || (typeof v === "string" ? v.split(",") : v).length <= maxPlayerIds,
    () => `Expected at most ${maxPlayerIds} player ids`
  )
)
  .Decode((v): string[] | undefined =>
    v === undefined ? undefined : typeof v === "string" ? v.split(",") : v
  )
  .Encode(v => v);

export const PlayerScoresQuerySchema = Type.Object({
  search: Type.Optional(Type.String()),
  hmd: Type.Optional(HmdSchema),
  playerIds: Type.Optional(PlayerIdsSchema),
  realmId: Type.Optional(RealmIdSchema),
});
export type PlayerScoresQuery = StaticDecode<typeof PlayerScoresQuerySchema>;
