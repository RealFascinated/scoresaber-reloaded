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

/**
 * Sign-in providers that prove ownership of a platform account, and the connection they create.
 * Meta and Quest players are both `OCULUS`, as on ScoreSaber.
 */
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
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh the session once a day
  },
  socialProviders: {
    steam: {
      apiKey: env.STEAM_API_KEY,
      // Steam IDs are ScoreSaber player ids, so prefer the tracked player's name and avatar.
      // Returns no fields for untracked players, keeping Steam's own name and avatar.
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
        // Record the verified platform account as a connection. `playerId` is not client-writable
        // (`input: false`), so it is set from the connection instead of through the provider profile
        // (Better Auth drops those fields).
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
    // OAuth failures redirect here with `?error=<code>`
    errorURL: env.NEXT_PUBLIC_WEBSITE_URL,
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession["user"];
