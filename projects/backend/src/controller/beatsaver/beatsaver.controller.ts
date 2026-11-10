import { NotFoundError } from "@ssr/common/error/not-found-error";
import { BeatSaverMapParamsSchema } from "@ssr/common/schemas/beatsaver/beatsaver-route";
import { BeatSaverMapSchema } from "@ssr/common/schemas/beatsaver/map/map";
import { Elysia } from "elysia";
import BeatSaverService from "../../service/external/beatsaver.service";

export default function beatsaverController(app: Elysia) {
  return app.group("/beatsaver", app =>
    app.get(
      "/map/:hash/:difficulty/:characteristic",
      {
        tags: ["BeatSaver"],
        params: BeatSaverMapParamsSchema,
        response: BeatSaverMapSchema,
        detail: {
          description: "Fetch BeatSaver map details",
        },
      },
      async ({ params: { hash, difficulty, characteristic } }) => {
        const map = await BeatSaverService.getMap(hash, difficulty, characteristic);
        if (!map) {
          throw new NotFoundError(`BeatSaver map ${hash} not found`);
        }
        return map;
      }
    )
  );
}
