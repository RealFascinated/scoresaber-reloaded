import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { generateBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { uploadPaste } from "@ssr/common/utils/paste-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { DiscordChannels, sendFile, sendMessageToChannel } from "../../bot/bot";
import PlaylistService from "../playlist/playlist.service";
import { LeaderboardUpdate } from "./leaderboard-ranking.service";

export class LeaderboardNotificationsService {
  /**
   * Logs the leaderboard updates to Discord.
   */
  public static async logLeaderboardUpdates(updates: LeaderboardUpdate[]): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    Logger.info(`Logging ${updates.length} leaderboard updates...`);

    const newlyRankedMaps = updates.filter(
      update => update.newLeaderboard.ranked && !update.previousLeaderboard?.ranked
    );
    const buffedMaps = updates.filter(
      update => update.newLeaderboard.stars > (update.previousLeaderboard?.stars ?? 0)
    );
    const nerfedMaps = updates.filter(
      update => update.newLeaderboard.stars < (update.previousLeaderboard?.stars ?? 0)
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

    let changelog = "";

    // Newly ranked maps
    changelog = addChanges(changelog, newlyRankedMaps, update => {
      const difficulty = getDifficultyName(
        getDifficulty(update.newLeaderboard.difficulty.difficulty)
      );
      return `now ranked ${update.newLeaderboard.fullName} (${difficulty}) mapped by ${update.newLeaderboard.levelAuthorName} at ${update.newLeaderboard.stars} stars\n`;
    });

    // Buffed maps
    changelog = addChanges(changelog, buffedMaps, update => {
      const difficulty = getDifficultyName(
        getDifficulty(update.newLeaderboard.difficulty.difficulty)
      );
      return `changed (buffed) ${update.newLeaderboard.fullName} (${difficulty}) mapped by ${update.newLeaderboard.levelAuthorName} from ${update.previousLeaderboard?.stars} to ${update.newLeaderboard.stars} stars\n`;
    });

    // Nerfed maps
    changelog = addChanges(changelog, nerfedMaps, update => {
      const difficulty = getDifficultyName(
        getDifficulty(update.newLeaderboard.difficulty.difficulty)
      );
      return `nerfed (nerf) ${update.newLeaderboard.fullName} (${difficulty}) mapped by ${update.newLeaderboard.levelAuthorName} from ${update.previousLeaderboard?.stars} to ${update.newLeaderboard.stars} stars\n`;
    });

    const date = formatDate(new Date(), "DD-MM-YYYY");
    const pasteUrl = await uploadPaste(changelog);
    await sendMessageToChannel(
      DiscordChannels.RANKED_BATCH_LOGS,
      `<@&1338261690952978442> New Ranked Batch: ${pasteUrl}`
    );

    const leaderboards = PlaylistService.processLeaderboards(
      [...newlyRankedMaps, ...buffedMaps].map(update => update.newLeaderboard)
    );

    // Create a playlist of the changes
    const playlist = PlaylistService.createScoreSaberPlaylist(
      `scoresaber-ranked-batch-${date}`,
      `ScoreSaber Ranked Batch (${date})`,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      leaderboards.maps,
      leaderboards.highlightedIds,
      PlaylistService.PLAYLIST_IMAGE_BASE64,
      "ranked-batch"
    );

    if (await PlaylistService.playlistExists(`scoresaber-ranked-batch-${date}`)) {
      await PlaylistService.updatePlaylist(`scoresaber-ranked-batch-${date}`, playlist);
    } else {
      await PlaylistService.createPlaylist(playlist);
    }
    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `scoresaber-ranked-batch-${date}.bplist`,
      JSON.stringify(await generateBeatSaberPlaylist(playlist), null, 2)
    );

    console.log(changelog);
  }
}
