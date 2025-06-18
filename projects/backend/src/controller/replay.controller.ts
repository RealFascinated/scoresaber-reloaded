import { getBeatLeaderReplayCdnUrl } from "@ssr/common/utils/beatleader-utils";
import { redirect, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import BeatLeaderService from "../service/beatleader.service";

@Controller("/replay")
export default class ReplayController {
  @Get("/:scoreId", {
    config: {},
    params: t.Object({
      scoreId: t.String({
        required: true,
        pattern: "^\\d+\\.bsor$",
      }),
    }),
  })
  public async redirectReplay({ params: { scoreId } }: { params: { scoreId: string } }) {
    const beatleaderScore = await BeatLeaderService.getAdditionalScoreData(
      parseInt(scoreId.replace(".bsor", "")),
      true
    );
    return redirect(getBeatLeaderReplayCdnUrl(beatleaderScore!)!);
  }
}
