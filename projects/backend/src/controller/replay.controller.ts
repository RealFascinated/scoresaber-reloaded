import { getBeatLeaderReplayCdnUrl } from "@ssr/common/utils/beatleader-utils";
import { redirect, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import BeatLeaderService from "../service/beatleader.service";

@Controller("/replay")
export default class ReplayController {
  @Get("/:scoreId", {
    config: {},
    params: t.Object({
      scoreId: t.Number({ required: true }),
    }),
  })
  public async redirectReplay({ params: { scoreId } }: { params: { scoreId: number } }) {
    const beatleaderScore = await BeatLeaderService.getAdditionalScoreData(scoreId, true);
    const redirectUrl = getBeatLeaderReplayCdnUrl(beatleaderScore!)!;
    return redirect(redirectUrl);
  }
}
