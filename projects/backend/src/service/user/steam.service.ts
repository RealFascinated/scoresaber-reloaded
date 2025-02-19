import { auth } from "@ssr/common/auth/auth";
import { env } from "@ssr/common/env";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import SteamAuth from "node-steam-openid";
import type { UserSessionContext } from "../../common/user-session-context";

const steam = new SteamAuth({
  realm: env.NEXT_PUBLIC_API_URL,
  returnUrl: `${env.NEXT_PUBLIC_API_URL}/user/callback/steam`,
  apiKey: env.OPENID_AUTH_KEY,
});

export default class SteamService {
  public static async getSteamAuthRedirectUrl() {
    return await steam.getRedirectUrl();
  }

  public static async handleSteamAuth({ session, request, user, redirect }: UserSessionContext) {
    try {
      if (!session || !user) {
        throw new InternalServerError("No session found");
      }
      const steamUser = await steam.authenticate(request);

      auth.api.updateUser({
        body: {
          steamId: steamUser.steamid,
        },
        headers: request.headers,
      });

      return redirect(env.NEXT_PUBLIC_WEBSITE_URL);
    } catch (error) {
      throw new InternalServerError(`Failed to authenticate - ${error}`);
    }
  }

  public static async handleSteamUnlink({ session, request, user }: UserSessionContext) {
    if (!session || !user) {
      console.log({
        session,
        user,
      });
      throw new InternalServerError("No session found");
    }

    auth.api.updateUser({
      body: {
        steamId: null,
      },
      headers: request.headers,
    });

    return {
      success: true,
    };
  }
}
