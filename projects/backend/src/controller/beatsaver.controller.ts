import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON, { SuperJSONResult } from "superjson";
import { Swagger } from "../common/swagger";
import BeatSaverService from "../service/beatsaver.service";

@Controller("/beatsaver")
export default class BeatSaverController {
  @Get("/map/:hash/:difficulty/:characteristic", {
    config: {},
    tags: ["beatsaver"],
    params: t.Object({
      hash: t.String({ required: true }),
      difficulty: t.String({ required: true }),
      characteristic: t.String({ required: true }),
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
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
    params: { hash, difficulty, characteristic, type },
  }: {
    params: {
      hash: string;
      difficulty: MapDifficulty;
      characteristic: MapCharacteristic;
      type: DetailType;
    };
  }): Promise<SuperJSONResult> {
    const map = await BeatSaverService.getMap(hash, difficulty, characteristic, type);
    if (!map) {
      throw new NotFoundError("BeatSaver map not found");
    }
    return SuperJSON.serialize(map);
  }
}
