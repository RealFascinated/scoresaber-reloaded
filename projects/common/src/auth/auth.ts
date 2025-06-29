import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { env } from "../env";
import { getMongooseConnection } from "../mongo";
import { steamAuthPlugin } from "./plugin/steam-auth-plugin";

export const auth = betterAuth({
  database: mongodbAdapter((await getMongooseConnection()).db!),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      steamId: {
        type: "string",
        required: false,
      },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_API_URL,
  appName: env.NEXT_PUBLIC_WEBSITE_NAME,
  trustedOrigins: [env.NEXT_PUBLIC_WEBSITE_URL],
  plugins: [steamAuthPlugin({ steamApiKey: env.STEAM_API_KEY })],
});

export type Session = typeof auth.$Infer.Session.session;
