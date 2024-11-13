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
