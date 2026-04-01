import { env } from "@ssr/common/env";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { uploadPaste } from "@ssr/common/utils/paste-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { DiscordChannels, sendFile, sendMessageToChannel } from "../../bot/bot";
import { LeaderboardUpdate } from "./leaderboard-ranked-sync.service";

export class LeaderboardRankedSyncNotificationsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Ranked Sync Notifications");

  /**
   * Logs the leaderboard updates to Discord.
   */
  public static async logLeaderboardUpdates(updates: LeaderboardUpdate[]): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    LeaderboardRankedSyncNotificationsService.logger.info(`Logging ${updates.length} leaderboard updates...`);

    const newlyRankedMaps = updates.filter(
      update => update.newLeaderboard.ranked && !update.previousLeaderboard?.ranked
    );
    const buffedMaps = updates.filter(
      update =>
        update.previousLeaderboard?.ranked &&
        update.newLeaderboard.stars > (update.previousLeaderboard?.stars ?? 0)
    );
    const nerfedMaps = updates.filter(
      update =>
        update.previousLeaderboard?.ranked &&
        update.newLeaderboard.stars < (update.previousLeaderboard?.stars ?? 0)
    );

    /**
     * Adds the changes to the changelog.
     */
    function addChanges(
      changelog: string,
      updates: LeaderboardUpdate[],
      addChange: (update: LeaderboardUpdate) => string
    ): string {
      if (updates.length === 0) {
        return changelog;
      }

      for (const update of updates) {
        changelog += addChange(update);
      }
      return changelog;
    }

    /**
     * Formats previous stars for changelog entries.
     */
    function formatPreviousStars(update: LeaderboardUpdate): string {
      return update.previousLeaderboard?.stars?.toString() ?? "unranked";
    }

    let changelog = "";

    // Newly ranked maps
    changelog = addChanges(changelog, newlyRankedMaps, update => {
      const difficulty = getDifficultyName(getDifficulty(update.newLeaderboard.difficulty.difficulty));
      return `now ranked ${update.newLeaderboard.fullName} (${difficulty}) mapped by ${update.newLeaderboard.levelAuthorName} at ${update.newLeaderboard.stars} stars\n`;
    });

    // Buffed maps
    changelog = addChanges(changelog, buffedMaps, update => {
      const difficulty = getDifficultyName(getDifficulty(update.newLeaderboard.difficulty.difficulty));
      return `changed (buffed) ${update.newLeaderboard.fullName} (${difficulty}) mapped by ${update.newLeaderboard.levelAuthorName} from ${formatPreviousStars(update)} to ${update.newLeaderboard.stars} stars\n`;
    });

    // Nerfed maps
    changelog = addChanges(changelog, nerfedMaps, update => {
      const difficulty = getDifficultyName(getDifficulty(update.newLeaderboard.difficulty.difficulty));
      return `nerfed (nerf) ${update.newLeaderboard.fullName} (${difficulty}) mapped by ${update.newLeaderboard.levelAuthorName} from ${formatPreviousStars(update)} to ${update.newLeaderboard.stars} stars\n`;
    });

    const date = formatDate(new Date(), "DD-MM-YYYY");
    const pasteUrl = await uploadPaste(changelog);
    await sendMessageToChannel(
      DiscordChannels.RANKED_BATCH_LOGS,
      `<@&1338261690952978442> New Ranked Batch: ${pasteUrl}`
    );

    const playlistId = `scoresaber-ranked-batch-${date}`;

    // Create a playlist of the changes
    const playlist: Playlist = {
      playlistTitle: `Ranked Batch (${formatDate(new Date(), "Do MMMM, YYYY")})`,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/ranked-batch`,
      },
      songs: newlyRankedMaps.map(update => ({
        songName: update.newLeaderboard.songName,
        levelAuthorName: update.newLeaderboard.levelAuthorName,
        hash: update.newLeaderboard.songHash,
        difficulties: update.newLeaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    };

    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `${playlistId}.bplist`,
      JSON.stringify(playlist, null, 2)
    );
  }
}
