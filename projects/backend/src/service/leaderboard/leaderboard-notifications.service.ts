import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { generateBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { uploadPaste } from "@ssr/common/utils/paste-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { DiscordChannels, sendFile, sendMessageToChannel } from "../../bot/bot";
import { generateRankedBatchPlaylistImage } from "../../common/playlist.util";
import { LeaderboardWithUpdate } from "../../common/types/leaderboard";
import PlaylistService from "../playlist/playlist.service";

export class LeaderboardNotificationsService {
  /**
   * Logs the leaderboard updates to Discord.
   */
  public static async logLeaderboardUpdates(
    newlyRankedMaps: LeaderboardWithUpdate[],
    buffedMaps: LeaderboardWithUpdate[],
    nerfedMaps: LeaderboardWithUpdate[],
    unrankedLeaderboards: ScoreSaberLeaderboard[]
  ): Promise<void> {
    let changelog = "";

    // Newly ranked maps
    for (const change of newlyRankedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));

      changelog += `now ranked ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} at ${change.leaderboard.stars} stars\n`;
    }

    changelog += "\n";

    // Buffed maps
    for (const change of buffedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));

      changelog += `changed (buffed) ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} from ${change.update.previousLeaderboard?.stars} to ${change.leaderboard.stars} stars\n`;
    }

    changelog += "\n";

    // Nerfed maps
    for (const change of nerfedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));

      changelog += `nerfed (nerf) ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} from ${change.update.previousLeaderboard?.stars} to ${change.leaderboard.stars} stars\n`;
    }

    changelog += "\n";

    // Unranked maps
    for (const leaderboard of unrankedLeaderboards) {
      const difficulty = getDifficultyName(getDifficulty(leaderboard.difficulty.difficulty));

      changelog += `unranked ${leaderboard.fullName} (${difficulty}) mapped by ${leaderboard.levelAuthorName}\n`;
    }

    const date = formatDate(new Date(), "DD-MM-YYYY");

    const pasteUrl = await uploadPaste(changelog);
    await sendMessageToChannel(
      DiscordChannels.RANKED_BATCH_LOGS,
      `<@&1338261690952978442> New Ranked Batch: ${pasteUrl}`
    );

    const leaderboards = PlaylistService.processLeaderboards(
      [...newlyRankedMaps, ...buffedMaps].map(update => update.leaderboard)
    );

    // Create a playlist of the changes
    const playlist = PlaylistService.createScoreSaberPlaylist(
      `scoresaber-ranked-batch-${date}`,
      `ScoreSaber Ranked Batch (${date})`,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      leaderboards.maps,
      leaderboards.highlightedIds,
      await generateRankedBatchPlaylistImage(),
      "ranked-batch"
    );
    await PlaylistService.createPlaylist(playlist);
    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `scoresaber-ranked-batch-${date}.bplist`,
      JSON.stringify(await generateBeatSaberPlaylist(playlist), null, 2)
    );
    Logger.info(
      `Logged ${newlyRankedMaps.length + buffedMaps.length + nerfedMaps.length} leaderboard changes to Discord.`
    );
  }
}
