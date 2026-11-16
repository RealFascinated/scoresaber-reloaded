import { SuggestedMapsResponseSchema } from "@ssr/common/schemas/suggested-maps/suggested-maps";
import { SuggestedMapsQuerySchema } from "@ssr/common/schemas/suggested-maps/suggested-maps-route";
import { Elysia } from "elysia";
import { SuggestedMapsService } from "../../service/suggested-maps/suggested-maps.service";

export default function suggestedMapsController(app: Elysia) {
  return app.group("/suggested-maps", app =>
    app.get(
      "/",
      {
        tags: ["SuggestedMaps"],
        query: SuggestedMapsQuerySchema,
        response: SuggestedMapsResponseSchema,
        detail: {
          description:
            "Rank ranked maps by how much more pp they pay than maps of the same stars, optionally for a player's pp list",
        },
      },
      async ({ query }) => {
        return await SuggestedMapsService.getSuggestedMaps(query);
      }
    )
  );
}
