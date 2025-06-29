import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { Controller, Get } from "elysia-decorators";
import { userAuthHandler } from "../common/user-auth-handler";
import type { UserSessionContext } from "../common/user-session-context";
import ScoreSaberService from "../service/scoresaber.service";
import { UserPreferencesService } from "../service/user-preferences.service";

@Controller("/@me")
export default class MeController {
  @Get("/preferences", {
    config: {},
    beforeHandle: userAuthHandler,
  })
  public async getPreferences(context: UserSessionContext) {
    return UserPreferencesService.getPreferences(context.user.id);
  }

  @Get("/player", {
    config: {},
    beforeHandle: userAuthHandler,
  })
  public async getPlayer(context: UserSessionContext) {
    const steamId = context.user.steamId;
    if (steamId == undefined) {
      throw new BadRequestError("User does not have a steam id");
    }
    return ScoreSaberService.getPlayer(steamId);
  }
}
