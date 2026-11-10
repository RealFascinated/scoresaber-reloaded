import type { AuthConnectionProvider } from "@ssr/common/schemas/auth/connection-provider";
import type { AuthConnection } from "@ssr/common/schemas/response/auth/me";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { authConnectionsTable, authUsersTable } from "../db/schema";

export type LinkConnectionResult = "linked" | "already-linked" | "taken";

export class AuthConnectionsRepository {
  /**
   * Gets the connections of a user, the primary one first.
   *
   * @param userId the user to get the connections of
   */
  public static async getByUserId(userId: string): Promise<AuthConnection[]> {
    const rows = await db
      .select({
        provider: authConnectionsTable.provider,
        id: authConnectionsTable.providerPlayerId,
        isPrimary: authConnectionsTable.isPrimary,
      })
      .from(authConnectionsTable)
      .where(eq(authConnectionsTable.userId, userId))
      .orderBy(asc(authConnectionsTable.isPrimary), asc(authConnectionsTable.id));

    // `false` sorts before `true`, so the primary connection is last
    return rows.reverse();
  }

  /**
   * Links a platform account to a user. The first connection of a user becomes the primary one,
   * which also sets the user's public player id.
   *
   * A platform account can only belong to one user, it is never moved from another user.
   *
   * @param userId the user to link the account to
   * @param provider the platform of the account
   * @param providerPlayerId the player id on that platform
   */
  public static async link(
    userId: string,
    provider: AuthConnectionProvider,
    providerPlayerId: string
  ): Promise<LinkConnectionResult> {
    return db.transaction(async tx => {
      const [primary] = await tx
        .select({ id: authConnectionsTable.id })
        .from(authConnectionsTable)
        .where(and(eq(authConnectionsTable.userId, userId), eq(authConnectionsTable.isPrimary, true)))
        .limit(1);

      const inserted = await tx
        .insert(authConnectionsTable)
        .values({ userId, provider, providerPlayerId, isPrimary: !primary })
        .onConflictDoNothing()
        .returning({ id: authConnectionsTable.id });

      if (inserted.length === 0) {
        const [existing] = await tx
          .select({ userId: authConnectionsTable.userId })
          .from(authConnectionsTable)
          .where(
            and(
              eq(authConnectionsTable.provider, provider),
              eq(authConnectionsTable.providerPlayerId, providerPlayerId)
            )
          )
          .limit(1);
        return existing?.userId === userId ? "already-linked" : "taken";
      }

      if (!primary) {
        await tx
          .update(authUsersTable)
          .set({ playerId: providerPlayerId })
          .where(eq(authUsersTable.id, userId));
      }
      return "linked";
    });
  }
}
