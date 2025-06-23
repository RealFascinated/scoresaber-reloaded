import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { generateBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { DiscordChannels, sendFile } from "../../bot/bot";
import { generateRankedBatchPlaylistImage } from "../../common/playlist.util";
import { LeaderboardUpdates } from "../../common/types/leaderboard";
import PlaylistService from "../playlist.service";

export class LeaderboardNotificationsService {
  /**
   * Logs the leaderboard updates to Discord.
   */
  public static async logLeaderboardUpdates(
    updates: LeaderboardUpdates,
    unrankedLeaderboards: ScoreSaberLeaderboard[]
  ): Promise<void> {
    let file = "";

    const newlyRankedMaps = updates.updatedLeaderboards.filter(
      update => update.update.rankedStatusChanged && update.leaderboard.ranked
    );

    const starRatingChangedMaps = updates.updatedLeaderboards.filter(
      update => update.update.starCountChanged
    );
    const nerfedMaps = starRatingChangedMaps.filter(
      update => update.leaderboard.stars < update.update.previousLeaderboard?.stars
    );
    const buffedMaps = starRatingChangedMaps.filter(
      update =>
        update.leaderboard.stars > update.update.previousLeaderboard?.stars &&
        update.update.previousLeaderboard?.stars > 0
    );

    // Newly ranked maps
    for (const change of newlyRankedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));
      file += `now ranked ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} at ${change.leaderboard.stars} stars\n`;
    }

    file += "\n";

    // Buffed maps
    for (const change of buffedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));
      file += `changed (buffed) ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} from ${change.update.previousLeaderboard?.stars} to ${change.leaderboard.stars} stars\n`;
    }

    file += "\n";

    // Nerfed maps
    for (const change of nerfedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));
      file += `nerfed (nerf) ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} from ${change.update.previousLeaderboard?.stars} to ${change.leaderboard.stars} stars\n`;
    }

    file += "\n";

    // Unranked maps
    for (const leaderboard of unrankedLeaderboards) {
      const difficulty = getDifficultyName(getDifficulty(leaderboard.difficulty.difficulty));
      file += `unranked ${leaderboard.fullName} (${difficulty}) mapped by ${leaderboard.levelAuthorName}\n`;
    }

    const date = formatDate(new Date(), "DD-MM-YYYY");

    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `ranked-batch-${date}.txt`,
      file.trim(),
      "<@&1338261690952978442>"
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
      [...newlyRankedMaps, ...buffedMaps].map(update => update.leaderboard.id),
      await generateRankedBatchPlaylistImage(),
      "ranked-batch"
    );
    await PlaylistService.createPlaylist(playlist);
    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `scoresaber-ranked-batch-${date}.bplist`,
      JSON.stringify(generateBeatSaberPlaylist(playlist), null, 2)
    );
    Logger.info("Logged leaderboard changes to Discord.");
  }
}
