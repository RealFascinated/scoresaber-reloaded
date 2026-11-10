import { USER_PINNED_SCORES_ROUTE } from "@ssr/common/api-routes";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
import {
  PinnedScoreIdsResponseSchema,
  PinnedScoresResponseSchema,
} from "@ssr/common/schemas/response/user/pinned-scores";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { PlayerPinnedScoresService } from "../../service/player/player-pinned-scores.service";
import { UserPinnedScoresService } from "../../service/user/user-pinned-scores.service";

const ScoreParamsSchema = t.Object({ scoreId: t.Integer({ minimum: 1 }) });
const PRIVATE_NO_STORE = "private, no-store";

export default function userPinnedScoresController(app: Elysia) {
  return app
    .use(authPlugin)
    .get(
      USER_PINNED_SCORES_ROUTE,
      {
        auth: true,
        tags: ["User"],
        response: PinnedScoreIdsResponseSchema,
        detail: { description: "Fetch the ids of the scores the signed-in user pinned" },
      },
      async ({ user, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return { scoreIds: await UserPinnedScoresService.getScoreIds(user.id) };
      }
    )
    .put(
      `${USER_PINNED_SCORES_ROUTE}/:scoreId`,
      {
        auth: true,
        tags: ["User"],
        params: ScoreParamsSchema,
        detail: { description: "Pin one of the signed-in user's scores (max 5)" },
      },
      async ({ user, params: { scoreId }, set, status }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        const result = await UserPinnedScoresService.pin(user, scoreId);
        if (result === "no-player" || result === "no-score") {
          return status(400, { statusCode: 400, message: "You can only pin scores you have set" });
        }
        if (result === "limit-reached") {
          return status(400, { statusCode: 400, message: "You have reached the maximum of pinned scores" });
        }
        return { scoreIds: await UserPinnedScoresService.getScoreIds(user.id) };
      }
    )
    .delete(
      `${USER_PINNED_SCORES_ROUTE}/:scoreId`,
      {
        auth: true,
        tags: ["User"],
        params: ScoreParamsSchema,
        detail: { description: "Unpin one of the signed-in user's scores" },
      },
      async ({ user, params: { scoreId }, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        await UserPinnedScoresService.unpin(user.id, scoreId);
        return { scoreIds: await UserPinnedScoresService.getScoreIds(user.id) };
      }
    )
    .get(
      "/player/:playerId/pinned-scores",
      {
        tags: ["Player"],
        params: t.Object({
          playerId: t.String({ minLength: 1, maxLength: 32, pattern: "^[A-Za-z0-9_-]+$" }),
        }),
        query: RealmQuerySchema,
        response: PinnedScoresResponseSchema,
        detail: { description: "Fetch the scores a player pinned to the top of their profile" },
      },
      async ({ params: { playerId }, query: { realmId = DEFAULT_REALM_ID } }) =>
        PlayerPinnedScoresService.getPinnedScores(playerId, realmId)
    );
}
