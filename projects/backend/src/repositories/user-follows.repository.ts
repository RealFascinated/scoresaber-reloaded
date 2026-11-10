import { and, asc, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { authUsersTable, userFollowsTable } from "../db/schema";

export type FollowResult = "followed" | "already-following" | "limit-reached";

const MAX_LISTED_FOLLOWERS = 100;

export class UserFollowsRepository {
  /**
   * Gets the ids of the players a user follows, oldest first.
   *
   * @param userId the user to get the followed players of
   */
  public static async getFollowingIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ playerId: userFollowsTable.followingPlayerId })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.userId, userId))
      .orderBy(asc(userFollowsTable.createdAt), asc(userFollowsTable.followingPlayerId));
    return rows.map(row => row.playerId);
  }

  /**
   * Makes a user follow a player, unless they already do or already follow `maxFollowing` players.
   *
   * @param userId the user that follows
   * @param playerId the player to follow
   * @param maxFollowing how many players a user can follow
   */
  public static async follow(userId: string, playerId: string, maxFollowing: number): Promise<FollowResult> {
    return db.transaction(async tx => {
      // Lock the user so two follows can't both slip under the limit
      await tx
        .select({ id: authUsersTable.id })
        .from(authUsersTable)
        .where(eq(authUsersTable.id, userId))
        .for("update");

      const [existing] = await tx
        .select({ playerId: userFollowsTable.followingPlayerId })
        .from(userFollowsTable)
        .where(and(eq(userFollowsTable.userId, userId), eq(userFollowsTable.followingPlayerId, playerId)));
      if (existing) {
        return "already-following";
      }

      const [{ total }] = await tx
        .select({ total: count() })
        .from(userFollowsTable)
        .where(eq(userFollowsTable.userId, userId));
      if (total >= maxFollowing) {
        return "limit-reached";
      }

      await tx.insert(userFollowsTable).values({ userId, followingPlayerId: playerId });
      return "followed";
    });
  }

  /**
   * Makes a user stop following a player. Does nothing if they weren't following them.
   *
   * @param userId the user that unfollows
   * @param playerId the player to unfollow
   */
  public static async unfollow(userId: string, playerId: string): Promise<void> {
    await db
      .delete(userFollowsTable)
      .where(and(eq(userFollowsTable.userId, userId), eq(userFollowsTable.followingPlayerId, playerId)));
  }

  /**
   * Gets the ids of the players that follow a player, newest first.
   *
   * @param playerId the player to get the followers of
   */
  public static async getFollowerIds(playerId: string): Promise<string[]> {
    const rows = await db
      .select({ playerId: authUsersTable.playerId })
      .from(userFollowsTable)
      .innerJoin(authUsersTable, eq(authUsersTable.id, userFollowsTable.userId))
      .where(and(eq(userFollowsTable.followingPlayerId, playerId), isNotNull(authUsersTable.playerId)))
      .orderBy(desc(userFollowsTable.createdAt))
      .limit(MAX_LISTED_FOLLOWERS);
    return rows.flatMap(row => (row.playerId ? [row.playerId] : []));
  }

  /**
   * Gets the ids of the players a player follows, oldest first. Only players with an account
   * can follow anyone, so this is empty for everyone else.
   *
   * @param playerId the player to get the followed players of
   */
  public static async getFollowingIdsByPlayerId(playerId: string): Promise<string[]> {
    const rows = await db
      .select({ playerId: userFollowsTable.followingPlayerId })
      .from(userFollowsTable)
      .innerJoin(authUsersTable, eq(authUsersTable.id, userFollowsTable.userId))
      .where(eq(authUsersTable.playerId, playerId))
      .orderBy(asc(userFollowsTable.createdAt), asc(userFollowsTable.followingPlayerId));
    return rows.map(row => row.playerId);
  }

  /**
   * Counts the followers and followed players of a player.
   *
   * @param playerId the player to count for
   */
  public static async getCounts(playerId: string): Promise<{ followers: number; following: number }> {
    const [[followers], [following]] = await Promise.all([
      db
        .select({ total: count() })
        .from(userFollowsTable)
        .innerJoin(authUsersTable, eq(authUsersTable.id, userFollowsTable.userId))
        .where(and(eq(userFollowsTable.followingPlayerId, playerId), isNotNull(authUsersTable.playerId))),
      db
        .select({ total: count() })
        .from(userFollowsTable)
        .innerJoin(authUsersTable, eq(authUsersTable.id, userFollowsTable.userId))
        .where(eq(authUsersTable.playerId, playerId)),
    ]);
    return { followers: followers.total, following: following.total };
  }
}
