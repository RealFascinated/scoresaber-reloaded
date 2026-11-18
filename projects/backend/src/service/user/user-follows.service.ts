import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { UserFollowsRepository, type FollowResult } from "../../repositories/user-follows.repository";

export type FollowPlayerResult = "self" | FollowResult;

export class UserFollowsService {
  /**
   * Gets the ids of the players a user follows, oldest first.
   *
   * @param userId the user to get the followed players of
   */
  public static getFollowingIds(userId: string) {
    return UserFollowsRepository.getFollowingIds(userId);
  }

  /**
   * Makes a user follow a player. Users can't follow themselves or follow more than
   * `SHARED_CONSTS.maxFollowing` players.
   *
   * @param user the user that follows, with the player they play as (if any)
   * @param playerId the player to follow
   */
  public static async follow(user: { id: string; playerId?: string | null }, playerId: string) {
    if (user.playerId === playerId) {
      return "self";
    }
    return UserFollowsRepository.follow(user.id, playerId, SHARED_CONSTS.maxFollowing);
  }

  /**
   * Makes a user stop following a player. Does nothing if they weren't following them.
   *
   * @param userId the user that unfollows
   * @param playerId the player to unfollow
   */
  public static unfollow(userId: string, playerId: string) {
    return UserFollowsRepository.unfollow(userId, playerId);
  }

  /**
   * Counts the followers and followed players of a player.
   *
   * @param playerId the player to count for
   */
  public static getCounts(playerId: string) {
    return UserFollowsRepository.getCounts(playerId);
  }

  /**
   * Gets the ids of the players that follow a player, newest first (the latest 100).
   *
   * @param playerId the player to get the followers of
   */
  public static getFollowerIds(playerId: string) {
    return UserFollowsRepository.getFollowerIds(playerId);
  }

  /**
   * Gets the ids of the players a player follows, oldest first.
   *
   * @param playerId the player to get the followed players of
   */
  public static getFollowingIdsByPlayerId(playerId: string) {
    return UserFollowsRepository.getFollowingIdsByPlayerId(playerId);
  }
}
