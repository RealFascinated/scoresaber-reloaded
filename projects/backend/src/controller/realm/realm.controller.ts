import { RealmPpCurveResponseSchema } from "@ssr/common/schemas/response/realm/realm-pp-curve";
import { RealmsResponseSchema } from "@ssr/common/schemas/response/realm/realms";
import { Elysia, t } from "elysia";
import { RealmService } from "../../service/realm/realm.service";

export default function realmController(app: Elysia) {
  return app.group("/realms", app =>
    app
      .get(
        "/",
        async () => {
          return await RealmService.getRealms();
        },
        {
          tags: ["Realms"],
          response: RealmsResponseSchema,
          detail: {
            description: "Fetch all realms",
          },
        }
      )
      .get(
        "/:id/pp-curve",
        async ({ params: { id } }) => {
          return await RealmService.getRealmPpCurve(id);
        },
        {
          tags: ["Realms"],
          params: t.Object({
            id: t.Integer({ minimum: 1 }),
          }),
          response: RealmPpCurveResponseSchema,
          detail: {
            description: "Fetch the pp curve of a realm",
          },
        }
      )
  );
}
