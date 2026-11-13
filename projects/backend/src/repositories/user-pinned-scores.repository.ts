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
   * Gets the scores a player pinned with their messages. Only players with an account can pin.
   *
   * @param playerId the player to get the pins of
   */
  public static async getPinsByPlayerId(
    playerId: string
  ): Promise<{ scoreId: number; message: string | null }[]> {
    return db
      .select({ scoreId: userPinnedScoresTable.scoreId, message: userPinnedScoresTable.message })
      .from(userPinnedScoresTable)
      .innerJoin(authUsersTable, eq(authUsersTable.id, userPinnedScoresTable.userId))
      .where(eq(authUsersTable.playerId, playerId))
      .orderBy(asc(userPinnedScoresTable.createdAt), asc(userPinnedScoresTable.scoreId));
  }

  /**
   * Sets the message of a pinned score.
   *
   * @param userId the user that pinned the score
   * @param scoreId the pinned score
   * @param message the message, or null to remove it
   * @returns false if the score isn't pinned by the user
   */
  public static async setMessage(userId: string, scoreId: number, message: string | null): Promise<boolean> {
    const updated = await db
      .update(userPinnedScoresTable)
      .set({ message })
      .where(and(eq(userPinnedScoresTable.userId, userId), eq(userPinnedScoresTable.scoreId, scoreId)))
      .returning({ scoreId: userPinnedScoresTable.scoreId });
    return updated.length > 0;
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
