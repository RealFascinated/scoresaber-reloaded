import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { MinioBucket } from "@ssr/common/minio-buckets";
import Request from "@ssr/common/utils/request";
import { formatDuration } from "@ssr/common/utils/time-utils";
import MinioService from "./minio.service";
import ScoreSaberService from "./scoresaber.service";

export default class CDNService {
  /**
   * Gets a file to use in the CDN, if it doesn't exist in the bucket,
   * it will be fetched and saved to the bucket.
   *
   * @param fetchCallback the callback to fetch the file
   * @param id the id of the file
   * @param bucket the bucket to save the file to
   * @returns the file
   */
  private static async getFile(
    fetchCallback: () => Promise<Buffer>,
    id: string,
    bucket: MinioBucket
  ): Promise<Buffer> {
    let avatar = await MinioService.getFile(bucket, `${id}.jpg`);
    if (!avatar) {
      const before = performance.now();
      const avatarBuffer = await fetchCallback();
      await MinioService.saveFile(bucket, `${id}.jpg`, avatarBuffer);
      avatar = avatarBuffer;
      Logger.info(
        `[CDN] Saved file ${id}.jpg to storage in ${formatDuration(performance.now() - before)}`
      );
    }
    return avatar;
  }

  /**
   * Gets a player avatar from the CDN, if it doesn't exist in the bucket,
   * it will be fetched and saved to the bucket.
   *
   * @param playerId the id of the player
   * @returns the player avatar
   */
  public static async getPlayerAvatar(playerId: string): Promise<Buffer> {
    return this.getFile(
      async () => {
        const player = await ScoreSaberService.getCachedPlayer(playerId);
        if (!player) {
          throw new NotFoundError("Player not found");
        }
        const buffer = await Request.get<ArrayBuffer>(player.profilePicture, {
          returns: "arraybuffer",
        });
        if (!buffer) {
          throw new NotFoundError("Avatar not found");
        }
        const avatarBuffer = Buffer.from(buffer);
        return avatarBuffer;
      },
      playerId,
      MinioBucket.Avatars
    );
  }

  /**
   * Gets a leaderboard cover art from the CDN, if it doesn't exist in the bucket,
   * it will be fetched and saved to the bucket.
   *
   * @param leaderboardId the id of the leaderboard
   * @returns the player avatar
   */
  public static async getLeaderboardCoverArt(leaderboardId: string): Promise<Buffer> {
    return this.getFile(
      async () => {
        const leaderboard = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboard(leaderboardId);
        if (!leaderboard) {
          throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
        }
        const buffer = await Request.get<ArrayBuffer>(leaderboard.coverImage, {
          returns: "arraybuffer",
        });
        if (!buffer) {
          throw new NotFoundError(`Cover art for leaderboard "${leaderboardId}" not found`);
        }
        const avatarBuffer = Buffer.from(buffer);
        return avatarBuffer;
      },
      leaderboardId,
      MinioBucket.LeaderboardCoverArt
    );
  }
}
