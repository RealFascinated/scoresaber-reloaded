import { Type, type StaticDecode } from "typebox";

/**
 * A list of player ids, used for who a user follows and who follows a player.
 */
export const PlayerIdListResponseSchema = Type.Object({
  playerIds: Type.Array(Type.String()),
});
export type PlayerIdListResponse = StaticDecode<typeof PlayerIdListResponseSchema>;

export const PlayerFollowsResponseSchema = Type.Object({
  /** How many users follow the player. */
  followers: Type.Integer({ minimum: 0 }),
  /** How many players the player follows. */
  following: Type.Integer({ minimum: 0 }),
});
export type PlayerFollowsResponse = StaticDecode<typeof PlayerFollowsResponseSchema>;
