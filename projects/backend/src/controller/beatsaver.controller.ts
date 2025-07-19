import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON, { SuperJSONResult } from "superjson";
import BeatSaverService from "../service/beatsaver.service";

@Controller("/beatsaver")
export default class BeatSaverController {
  @Get("/map/:hash/:difficulty/:characteristic", {
    config: {},
    tags: ["BeatSaver"],
    params: t.Object({
      hash: t.String({ required: true }),
      difficulty: t.String({ required: true }),
      characteristic: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
      superJson: t.Optional(t.Boolean()),
    }),
    detail: {
      description: "Fetch a map by hash, difficulty, and characteristic",
    },
  })
  public async getMapByHash({
    params: { hash, difficulty, characteristic },
    query: { type, superJson },
  }: {
    params: {
      hash: string;
      difficulty: MapDifficulty;
      characteristic: MapCharacteristic;
    };
    query: { type: DetailType; superJson: boolean };
  }): Promise<SuperJSONResult | BeatSaverMapResponse> {
    const map = await BeatSaverService.getMap(hash, difficulty, characteristic, type);
    if (!map) {
      throw new NotFoundError("BeatSaver map not found");
    }
    return superJson ? SuperJSON.serialize(map) : map;
  }
}
