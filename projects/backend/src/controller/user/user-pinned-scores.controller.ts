import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
import {
  PinnedScoreIdsResponseSchema,
  PinnedScoresResponseSchema,
} from "@ssr/common/schemas/response/user/pinned-scores";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import { UserPinnedScoresRepository } from "../../repositories/user-pinned-scores.repository";
import { PlayerPinnedScoresService } from "../../service/player/player-pinned-scores.service";

const ScoreParamsSchema = t.Object({ scoreId: t.Integer({ minimum: 1 }) });
const PRIVATE_NO_STORE = "private, no-store";

export default function userPinnedScoresController(app: Elysia) {
  return app
    .use(authPlugin)
    .get(
      "/user/pinned-scores",
      {
        auth: true,
        tags: ["User"],
        response: PinnedScoreIdsResponseSchema,
        detail: { description: "Fetch the ids of the scores the signed-in user pinned" },
      },
      async ({ user, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return { scoreIds: await UserPinnedScoresRepository.getScoreIds(user.id) };
      }
    )
    .put(
      "/user/pinned-scores/:scoreId",
      {
        auth: true,
        tags: ["User"],
        params: ScoreParamsSchema,
        detail: { description: "Pin one of the signed-in user's scores (max 5)" },
      },
      async ({ user, params: { scoreId }, set, status }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        const result = await UserPinnedScoresRepository.pin(user.id, scoreId);
        if (result === "no-player" || result === "no-score") {
          return status(400, { statusCode: 400, message: "You can only pin scores you have set" });
        }
        if (result === "limit-reached") {
          return status(400, { statusCode: 400, message: "You have reached the maximum of pinned scores" });
        }
        return { scoreIds: await UserPinnedScoresRepository.getScoreIds(user.id) };
      }
    )
    .delete(
      "/user/pinned-scores/:scoreId",
      {
        auth: true,
        tags: ["User"],
        params: ScoreParamsSchema,
        detail: { description: "Unpin one of the signed-in user's scores" },
      },
      async ({ user, params: { scoreId }, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;

        await UserPinnedScoresRepository.unpin(user.id, scoreId);
        return { scoreIds: await UserPinnedScoresRepository.getScoreIds(user.id) };
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
      async ({ params: { playerId }, query: { realmId } }) =>
        PlayerPinnedScoresService.getPinnedScores(playerId, realmId)
    );
}
