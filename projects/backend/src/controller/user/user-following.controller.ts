import {
  PlayerFollowsResponseSchema,
  PlayerIdListResponseSchema,
} from "@ssr/common/schemas/response/user/following";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { UserFollowsRepository } from "../../repositories/user-follows.repository";

const PlayerIdParamsSchema = t.Object({
  playerId: t.String({ minLength: 1, maxLength: 32, pattern: "^[A-Za-z0-9_-]+$" }),
});
const PRIVATE_NO_STORE = "private, no-store";

export default function userFollowingController(app: Elysia) {
  return app
    .use(authPlugin)
    .get(
      "/user/following",
      {
        auth: true,
        tags: ["User"],
        response: PlayerIdListResponseSchema,
        detail: { description: "Fetch the players the signed-in user follows" },
      },
      async ({ user, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return { playerIds: await UserFollowsRepository.getFollowingIds(user.id) };
      }
    )
    .put(
      "/user/following/:playerId",
      {
        auth: true,
        tags: ["User"],
        params: PlayerIdParamsSchema,
        detail: { description: "Follow a player, returns everyone the user follows" },
      },
      async ({ user, params: { playerId }, set, status }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        const result = await UserFollowsRepository.follow(user.id, playerId);
        if (result === "self") {
          return status(400, { statusCode: 400, message: "You can't follow yourself" });
        }
        if (result === "limit-reached") {
          return status(400, {
            statusCode: 400,
            message: "You have reached the maximum of followed players",
          });
        }
        return { playerIds: await UserFollowsRepository.getFollowingIds(user.id) };
      }
    )
    .delete(
      "/user/following/:playerId",
      {
        auth: true,
        tags: ["User"],
        params: PlayerIdParamsSchema,
        detail: { description: "Unfollow a player, returns everyone the user still follows" },
      },
      async ({ user, params: { playerId }, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        await UserFollowsRepository.unfollow(user.id, playerId);
        return { playerIds: await UserFollowsRepository.getFollowingIds(user.id) };
      }
    )
    .get(
      "/player/:playerId/follows",
      {
        tags: ["Player"],
        params: PlayerIdParamsSchema,
        response: PlayerFollowsResponseSchema,
        detail: { description: "Fetch how many users follow a player and how many players they follow" },
      },
      async ({ params: { playerId } }) => UserFollowsRepository.getCounts(playerId)
    )
    .get(
      "/player/:playerId/followers",
      {
        tags: ["Player"],
        params: PlayerIdParamsSchema,
        response: PlayerIdListResponseSchema,
        detail: { description: "Fetch the players that follow a player (the latest 100)" },
      },
      async ({ params: { playerId } }) => ({
        playerIds: await UserFollowsRepository.getFollowerIds(playerId),
      })
    )
    .get(
      "/player/:playerId/following",
      {
        tags: ["Player"],
        params: PlayerIdParamsSchema,
        response: PlayerIdListResponseSchema,
        detail: { description: "Fetch the players a player follows" },
      },
      async ({ params: { playerId } }) => ({
        playerIds: await UserFollowsRepository.getFollowingIdsByPlayerId(playerId),
      })
    );
}
