import { USER_FOLLOWING_ROUTE } from "@ssr/common/api-routes";
import {
  PlayerFollowsResponseSchema,
  PlayerIdListResponseSchema,
} from "@ssr/common/schemas/response/user/following";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { UserFollowsService } from "../../service/user/user-follows.service";

const PlayerIdParamsSchema = t.Object({
  playerId: t.String({ minLength: 1, maxLength: 32, pattern: "^[A-Za-z0-9_-]+$" }),
});
const PRIVATE_NO_STORE = "private, no-store";

export default function userFollowingController(app: Elysia) {
  return app
    .use(authPlugin)
    .get(
      USER_FOLLOWING_ROUTE,
      {
        auth: true,
        tags: ["User"],
        response: PlayerIdListResponseSchema,
        detail: { description: "Fetch the players the signed-in user follows" },
      },
      async ({ user, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return { playerIds: await UserFollowsService.getFollowingIds(user.id) };
      }
    )
    .put(
      `${USER_FOLLOWING_ROUTE}/:playerId`,
      {
        auth: true,
        tags: ["User"],
        params: PlayerIdParamsSchema,
        detail: { description: "Follow a player, returns everyone the user follows" },
      },
      async ({ user, params: { playerId }, set, status }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        const result = await UserFollowsService.follow(user, playerId);
        if (result === "self") {
          return status(400, { statusCode: 400, message: "You can't follow yourself" });
        }
        if (result === "limit-reached") {
          return status(400, {
            statusCode: 400,
            message: "You have reached the maximum of followed players",
          });
        }
        return { playerIds: await UserFollowsService.getFollowingIds(user.id) };
      }
    )
    .delete(
      `${USER_FOLLOWING_ROUTE}/:playerId`,
      {
        auth: true,
        tags: ["User"],
        params: PlayerIdParamsSchema,
        detail: { description: "Unfollow a player, returns everyone the user still follows" },
      },
      async ({ user, params: { playerId }, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        await UserFollowsService.unfollow(user.id, playerId);
        return { playerIds: await UserFollowsService.getFollowingIds(user.id) };
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
      async ({ params: { playerId } }) => UserFollowsService.getCounts(playerId)
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
        playerIds: await UserFollowsService.getFollowerIds(playerId),
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
        playerIds: await UserFollowsService.getFollowingIdsByPlayerId(playerId),
      })
    );
}
