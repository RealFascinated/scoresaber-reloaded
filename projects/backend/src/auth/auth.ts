import { AUTH_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import type { AuthConnectionProvider } from "@ssr/common/schemas/auth/connection-provider";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  authAccountsTable,
  authSessionsTable,
  authUsersTable,
  authVerificationsTable,
  scoreSaberAccountsTable,
} from "../db/schema";
import { AuthConnectionsRepository } from "../repositories/auth-connections.repository";

/** Origins allowed to make credentialed requests to the auth routes. */
export const AUTH_TRUSTED_ORIGINS: string[] = [env.NEXT_PUBLIC_WEBSITE_URL];

const AUTH_PROVIDER_CONNECTIONS: Record<string, AuthConnectionProvider | undefined> = {
  steam: "STEAM",
};

export const auth = betterAuth({
  appName: env.NEXT_PUBLIC_WEBSITE_NAME,
  baseURL: env.NEXT_PUBLIC_API_URL,
  basePath: AUTH_ROUTE,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: AUTH_TRUSTED_ORIGINS,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUsersTable,
      session: authSessionsTable,
      account: authAccountsTable,
      verification: authVerificationsTable,
    },
  }),
  user: {
    additionalFields: {
      playerId: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: {
    steam: {
      apiKey: env.STEAM_API_KEY,
      mapProfileToUser: async profile => {
        const [player] = await db
          .select({ name: scoreSaberAccountsTable.name, avatar: scoreSaberAccountsTable.avatar })
          .from(scoreSaberAccountsTable)
          .where(eq(scoreSaberAccountsTable.id, profile.steamid))
          .limit(1);

        return player ? { name: player.name, image: player.avatar } : {};
      },
    },
  },
  databaseHooks: {
    account: {
      create: {
        after: async account => {
          const provider = AUTH_PROVIDER_CONNECTIONS[account.providerId];
          if (provider) {
            await AuthConnectionsRepository.link(account.userId, provider, account.accountId);
          }
        },
      },
    },
  },
  advanced: {
    cookiePrefix: "ssr",
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
    },
    ...(env.AUTH_COOKIE_DOMAIN && {
      crossSubDomainCookies: { enabled: true, domain: env.AUTH_COOKIE_DOMAIN },
    }),
  },
  onAPIError: {
    errorURL: env.NEXT_PUBLIC_WEBSITE_URL,
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession["user"];
