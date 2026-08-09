import { NotFoundError } from "@ssr/common/error/not-found-error";
import { BeatSaverMapSchema } from "@ssr/common/schemas/beatsaver/map/map";
import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { Elysia, t } from "elysia";
import BeatSaverService from "../../service/external/beatsaver.service";

export default function beatsaverController(app: Elysia) {
  return app.group("/beatsaver", app =>
    app.get(
      "/map/:hash/:difficulty/:characteristic",
      async ({ params: { hash, difficulty, characteristic } }) => {
        const map = await BeatSaverService.getMap(hash, difficulty, characteristic);
        if (!map) {
          throw new NotFoundError(`BeatSaver map ${hash} not found`);
        }
        return map;
      },
      {
        tags: ["BeatSaver"],
        params: t.Object({
          // BeatSaver map hashes: legacy 32-char hex (MD5 of the map zip) and
          // the current 40-char hex (SHA1 of the version zip). Accept both;
          // reject path separators and over-long values that could reach the
          // upstream API or overflow the varchar(64) hash column.
          hash: t.String({ pattern: "^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{40})$" }),
          difficulty: MapDifficultySchema,
          characteristic: MapCharacteristicSchema,
        }),
        response: BeatSaverMapSchema,
        detail: {
          description: "Fetch BeatSaver map details",
        },
      }
    )
  );
}
