import { RealmPpCurveParamsSchema } from "@ssr/common/schemas/realm/realm-route";
import { RealmPpCurveResponseSchema } from "@ssr/common/schemas/response/realm/realm-pp-curve";
import { RealmsResponseSchema } from "@ssr/common/schemas/response/realm/realms";
import { Elysia } from "elysia";
import { RealmService } from "../../service/realm/realm.service";

export default function realmController(app: Elysia) {
  return app.group("/realms", app =>
    app
      .get(
        "/",
        {
          tags: ["Realms"],
          response: RealmsResponseSchema,
          detail: {
            description: "Fetch all realms",
          },
        },
        async () => {
          return await RealmService.getRealms();
        }
      )
      .get(
        "/:id/pp-curve",
        {
          tags: ["Realms"],
          params: RealmPpCurveParamsSchema,
          response: RealmPpCurveResponseSchema,
          detail: {
            description: "Fetch the pp curve of a realm",
          },
        },
        async ({ params: { id } }) => {
          return await RealmService.getRealmPpCurve(id);
        }
      )
  );
}
