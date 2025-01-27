import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { Swagger } from "../common/swagger";
import BeatSaverService from "../service/beatsaver.service";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import SuperJSON, { SuperJSONResult } from "superjson";

@Controller("/beatsaver")
export default class BeatSaverController {
  @Get("/map/:hash/:difficulty/:characteristic", {
    config: {},
    tags: ["beatsaver"],
    params: t.Object({
      hash: t.String({ required: true }),
      difficulty: t.String({ required: true }),
      characteristic: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The beatsaver map.",
        },
        ...Swagger.responses.beatsaverMapNotFound,
      },
      description: "Lookup a beatsaver map",
    },
  })
  public async getMap({
    params: { hash, difficulty, characteristic },
  }: {
    params: { hash: string; difficulty: MapDifficulty; characteristic: MapCharacteristic };
  }): Promise<SuperJSONResult> {
    const map = await BeatSaverService.getMap(hash, difficulty, characteristic);
    if (!map) {
      throw new NotFoundError("BeatSaver map not found");
    }
    return SuperJSON.serialize(map);
  }
}
