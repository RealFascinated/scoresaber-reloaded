import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../db";
import { authUsersTable, userPinnedScoresTable } from "../db/schema";

export type PinResult = "pinned" | "already-pinned" | "limit-reached";

export class UserPinnedScoresRepository {
  /**
   * Gets the ids of the scores a user pinned, in the order they were pinned.
   *
   * @param userId the user to get the pins of
   */
  public static async getScoreIds(userId: string): Promise<number[]> {
    const rows = await db
      .select({ scoreId: userPinnedScoresTable.scoreId })
      .from(userPinnedScoresTable)
      .where(eq(userPinnedScoresTable.userId, userId))
      .orderBy(asc(userPinnedScoresTable.createdAt), asc(userPinnedScoresTable.scoreId));
    return rows.map(row => row.scoreId);
  }

  /**
   * Gets the ids of the scores a player pinned. Only players with an account can pin.
   *
   * @param playerId the player to get the pins of
   */
  public static async getScoreIdsByPlayerId(playerId: string): Promise<number[]> {
    const rows = await db
      .select({ scoreId: userPinnedScoresTable.scoreId })
      .from(userPinnedScoresTable)
      .innerJoin(authUsersTable, eq(authUsersTable.id, userPinnedScoresTable.userId))
      .where(eq(authUsersTable.playerId, playerId))
      .orderBy(asc(userPinnedScoresTable.createdAt), asc(userPinnedScoresTable.scoreId));
    return rows.map(row => row.scoreId);
  }

  /**
   * Pins a score for a user, unless it already is or the user already has `maxPinned` pinned scores.
   *
   * @param userId the user that pins
   * @param scoreId the score to pin
   * @param maxPinned how many scores a user can pin
   */
  public static async pin(userId: string, scoreId: number, maxPinned: number): Promise<PinResult> {
    return db.transaction(async tx => {
      // Lock the user so two pins can't both slip under the limit
      await tx
        .select({ id: authUsersTable.id })
        .from(authUsersTable)
        .where(eq(authUsersTable.id, userId))
        .for("update");

      const [existing] = await tx
        .select({ scoreId: userPinnedScoresTable.scoreId })
        .from(userPinnedScoresTable)
        .where(and(eq(userPinnedScoresTable.userId, userId), eq(userPinnedScoresTable.scoreId, scoreId)));
      if (existing) {
        return "already-pinned";
      }

      const [{ total }] = await tx
        .select({ total: count() })
        .from(userPinnedScoresTable)
        .where(eq(userPinnedScoresTable.userId, userId));
      if (total >= maxPinned) {
        return "limit-reached";
      }

      await tx.insert(userPinnedScoresTable).values({ userId, scoreId });
      return "pinned";
    });
  }

  /**
   * Unpins a score. Does nothing if it wasn't pinned.
   *
   * @param userId the user that unpins
   * @param scoreId the score to unpin
   */
  public static async unpin(userId: string, scoreId: number): Promise<void> {
    await db
      .delete(userPinnedScoresTable)
      .where(and(eq(userPinnedScoresTable.userId, userId), eq(userPinnedScoresTable.scoreId, scoreId)));
  }
}
