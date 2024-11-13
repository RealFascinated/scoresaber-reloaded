import { Playlist } from "@ssr/common/playlist/playlist";
import LeaderboardService from "./leaderboard.service";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

export default class PlaylistService {
  /**
   * Gets a playlist
   *
   * @param playlistId
   * @returns the playlist
   */
  public static async getPlaylist(playlistId: string): Promise<Playlist> {
    switch (playlistId) {
      case "scoresaber-ranked-maps": {
        return await this.createRankedMapsPlaylist();
      }
      default: {
        throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
      }
    }
  }

  /**
   * Creates a playlist with all ranked maps.
   * @private
   */
  public static async createRankedMapsPlaylist(): Promise<Playlist> {
    const rankedLeaderboards = await LeaderboardService.getRankedLeaderboards();
    const rankedIds = rankedLeaderboards.map(map => map.id);

    const rankedMaps: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of rankedLeaderboards) {
      if (rankedMaps.has(leaderboard.songHash)) {
        continue;
      }
      rankedMaps.set(leaderboard.songHash, leaderboard);
    }

    return new Playlist(
      "scoresaber-ranked-maps",
      `ScoreSaber Ranked Maps (${formatDateMinimal(new Date())})`,
      "ScoreSaber Reloaded",
      "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",
      Array.from(rankedMaps.values()).map(map => {
        return {
          songName: map.songName,
          songAuthor: map.songAuthorName,
          songHash: map.songHash,
          difficulties: map.difficulties
            .filter(difficulty => rankedIds.includes(difficulty.leaderboardId))
            .map(difficulty => {
              return {
                difficulty: difficulty.difficulty,
                characteristic: difficulty.characteristic,
              };
            }),
        };
      })
    );
  }
}
