import type { Context } from "elysia";
import { Controller, Get, Post } from "elysia-decorators";
import type { UserSessionContext } from "../common/user-session-context";
import SteamService from "../service/user/steam.service";

@Controller("/user")
export default class UserController {
  @Get("/link/steam", {
    config: {},
  })
  public async redirectSteamAuth({ redirect }: Context) {
    return redirect(await SteamService.getSteamAuthRedirectUrl());
  }

  @Post("/unlink/steam", {
    config: {},
  })
  public async unlinkSteam(context: UserSessionContext) {
    return SteamService.handleSteamUnlink(context);
  }

  @Get("/callback/steam", {
    config: {},
  })
  public async authenticateSteam(context: UserSessionContext) {
    return SteamService.handleSteamAuth(context);
  }
}
