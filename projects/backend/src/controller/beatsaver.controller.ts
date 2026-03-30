import { DetailTypeSchema } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { Elysia } from "elysia";
import { z } from "zod";
import BeatSaverService from "../service/beatsaver.service";

export default function beatsaverController(app: Elysia) {
  return app.group("/beatsaver", app =>
    app.get(
      "/map/:hash/:difficulty/:characteristic",
      async ({ params: { hash, difficulty, characteristic }, query: { type } }) => {
        const map = await BeatSaverService.getMap(hash, difficulty, characteristic, type);
        if (!map) {
          throw new NotFoundError(`BeatSaver map ${hash} not found`);
        }
        return map;
      },
      {
        tags: ["BeatSaver"],
        params: z.object({
          hash: z.string(),
          difficulty: MapDifficultySchema,
          characteristic: MapCharacteristicSchema,
        }),
        query: z.object({
          type: DetailTypeSchema,
        }),
        detail: {
          description: "Fetch BeatSaver map details",
        },
      }
    )
  );
}
