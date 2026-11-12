import { env } from "@ssr/common/env";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { uploadPaste } from "@ssr/common/utils/paste-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { DiscordChannels, sendFile, sendMessageToChannel } from "../../bot/bot";
import { ReweightService } from "../reweight/reweight.service";
import type { LeaderboardUpdate, RankedSyncResult } from "./leaderboard-ranked-sync.service";

const RANKED_BATCH_ROLE_MENTION = "<@&1338261690952978442>";

/**
 * Gets the URL of a reweight's page.
 */
export function getReweightUrl(reweightId: number): string {
  return `${env.NEXT_PUBLIC_WEBSITE_URL}/reweights/${reweightId}`;
}

/**
 * Builds the Discord message announcing a ranked batch.
 *
 * The role is not pinged for star changes that were merged into a reweight which was already
 * announced, unless the batch also ranked new maps.
 *
 * @param pasteUrl the uploaded changelog
 * @param hasNewlyRankedMaps whether the batch ranked any new maps
 * @param reweight the reweight the batch's star changes were recorded in, if any
 */
export function buildRankedBatchMessage(
  pasteUrl: string,
  hasNewlyRankedMaps: boolean,
  reweight: RankedSyncResult["reweight"]
): string {
  const isMergedUpdate = reweight?.alreadyNotified === true && !hasNewlyRankedMaps;
  const header = isMergedUpdate
    ? `Ranked Batch update (more maps were added to the reweight): ${pasteUrl}`
    : `${RANKED_BATCH_ROLE_MENTION} New Ranked Batch: ${pasteUrl}`;

  return reweight ? `${header}\nReweight: ${getReweightUrl(reweight.reweightId)}` : header;
}

export class LeaderboardRankedSyncNotificationsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Ranked Batch Notifications");

  /**
   * Logs the ranked batch to Discord.
   */
  public static async handleRankedBatch({ updates, reweight }: RankedSyncResult): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    LeaderboardRankedSyncNotificationsService.logger.info(
      `Handling ranked batch with ${updates.length} updates...`
    );

    const newlyRankedMaps = updates.filter(
      update => update.newLeaderboard.ranked && !update.previousLeaderboard?.ranked
    );
    const unrankedMaps = updates.filter(
      update => update.previousLeaderboard?.ranked && !update.newLeaderboard.ranked
    );
    const buffedMaps = updates.filter(
      update =>
        update.previousLeaderboard?.ranked &&
        update.newLeaderboard.ranked &&
        update.newLeaderboard.stars > (update.previousLeaderboard?.stars ?? 0)
    );
    const nerfedMaps = updates.filter(
      update =>
        update.previousLeaderboard?.ranked &&
        update.newLeaderboard.ranked &&
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

    // Unranked maps
    changelog = addChanges(changelog, unrankedMaps, update => {
      const difficulty = getDifficultyName(getDifficulty(update.newLeaderboard.difficulty.difficulty));
      return `unranked ${update.newLeaderboard.fullName} (${difficulty}) mapped by ${update.newLeaderboard.levelAuthorName} (was ${formatPreviousStars(update)} stars)\n`;
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

    const pasteUrl = await uploadPaste(changelog);
    await sendMessageToChannel(
      DiscordChannels.RANKED_BATCH_LOGS,
      buildRankedBatchMessage(pasteUrl, newlyRankedMaps.length > 0, reweight)
    );
    if (reweight && !reweight.alreadyNotified) {
      await ReweightService.markNotified(reweight.reweightId);
    }

    // Create a playlist of the changes
    const playlist: Playlist = {
      playlistTitle: `Ranked Batch (${formatDate(new Date(), "MMM D, YYYY")})`,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
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

    const date = formatDate(new Date(), "DD-MM-YYYY");
    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `scoresaber-ranked-batch-${date}.bplist`,
      JSON.stringify(playlist, null, 2)
    );
  }
}
