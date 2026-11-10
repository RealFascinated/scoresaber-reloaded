import { Type, type StaticDecode } from "typebox";
import { HmdSchema } from "../../../hmds";
import { SHARED_CONSTS } from "../../../shared-consts";
import { RealmIdSchema } from "../../realm/realm-query";

const PlayerIdsSchema = Type.Codec(Type.Union([Type.String(), Type.Array(Type.String()), Type.Undefined()]))
  .Decode((v): string[] | undefined => {
    const playerIds = v === undefined ? undefined : typeof v === "string" ? v.split(",") : v;
    if (playerIds !== undefined && playerIds.length > SHARED_CONSTS.maxFriends + 1) {
      throw new Error(`Expected at most ${SHARED_CONSTS.maxFriends + 1} player ids`);
    }
    return playerIds;
  })
  .Encode(v => v);

export const PlayerScoresQuerySchema = Type.Object({
  search: Type.Optional(Type.String()),
  hmd: Type.Optional(HmdSchema),
  playerIds: Type.Optional(PlayerIdsSchema),
  realmId: Type.Optional(RealmIdSchema),
});
export type PlayerScoresQuery = StaticDecode<typeof PlayerScoresQuerySchema>;
