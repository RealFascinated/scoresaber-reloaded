import {Playlist} from "@ssr/common/playlist/playlist";
import LeaderboardService from "./leaderboard.service";
import {NotFoundError} from "@ssr/common/error/not-found-error";
import {formatDateMinimal} from "@ssr/common/utils/time-utils";
import {ScoreSaberLeaderboard} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import {scoresaberService} from "@ssr/common/service/impl/scoresaber";
import {getScoreSaberLeaderboardFromToken} from "@ssr/common/token-creators";
import {fetchWithCache} from "../common/cache.util";
import CacheService, {ServiceCache} from "./cache.service";
import SSRImage, {ImageTextOptions} from "../common/ssr-image";
import {PlayerService} from "./player.service";
import ScoreSaberService from "./scoresaber.service";
import {ScoreSaberScore} from "@ssr/common/model/score/impl/scoresaber-score";
import {truncateText} from "@ssr/common/string-utils";

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
      case "scoresaber-qualified-maps": {
        return await this.createQualifiedMapsPlaylist();
      }
      case "scoresaber-ranking-queue-maps": {
        return await this.createRankingQueueMapsPlaylist();
      }
      default: {
        throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
      }
    }
  }

  /**
   * Creates a playlist for a snipe.
   *
   * @param user the user who is sniping
   * @param toSnipe the user who is being sniped
   * @returns the playlist
   */
  public static async getSnipePlaylist(user: string, toSnipe: string): Promise<Playlist> {
    if (!await PlayerService.playerExists(user) || !await PlayerService.playerExists(toSnipe)) {
      throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as one of the users isn't tracked.`);
    }

    const rawScores = await ScoreSaberService.getPlayerScores(toSnipe, {
      limit: 100,
      sort: "pp"
    });
    if (rawScores.length === 0) {
      throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as they have no scores.`);
    }

    const scores: { score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard }[] = [];
    for (const rawScore of rawScores) {
      const score = rawScore as ScoreSaberScore;
      const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
        "scoresaber",
        score.leaderboardId + ""
      );
      if (!leaderboardResponse) {
        throw new NotFoundError(`Leaderboard "${score.leaderboardId}" not found`);
      }
      const { leaderboard } = leaderboardResponse;
      scores.push({
        score: score,
        leaderboard: leaderboard
      });
    }

    scores.sort((a, b) => b.score.pp - a.score.pp);

    const toSnipePlayer = await ScoreSaberService.getPlayer(toSnipe);
    return new Playlist(
      "scoresaber-snipe-" + toSnipe,
      `Snipe ${toSnipePlayer.name}`,
      "ScoreSaber Reloaded",
      await this.generatePlaylistImage("SSR", {
        lines: [
          {
            text: "Snipe",
            color: "#222222",
            fontSize: 55,
            fontFamily: "SSR",
          },
          {
            text: truncateText(toSnipePlayer.name, 16)!,
            color: "#222222",
            fontSize: 45,
            fontFamily: "SSR",
          },
        ],
      }),
      scores.map(({ score, leaderboard }) => {
        return {
          songName: leaderboard.songName,
          songAuthor: leaderboard.songAuthorName,
          songHash: leaderboard.songHash,
          difficulties: leaderboard.difficulties
            .filter(difficulty => difficulty.leaderboardId === score.leaderboardId)
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



  /**
   * Creates a playlist with all ranked maps.
   * @private
   */
  public static async createRankedMapsPlaylist(): Promise<Playlist> {
    const rankedLeaderboards = await LeaderboardService.getRankedLeaderboards();
    const highlightedIds = rankedLeaderboards.map(map => map.id);

    const maps: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of rankedLeaderboards) {
      if (maps.has(leaderboard.songHash)) {
        continue;
      }
      maps.set(leaderboard.songHash, leaderboard);
    }

    return this.createScoreSaberPlaylist(
      "scoresaber-ranked-maps",
      `ScoreSaber Ranked Maps (${formatDateMinimal(new Date())})`,
      "ScoreSaber Reloaded",
      maps,
      highlightedIds,
      await this.generatePlaylistImage("SSR", {
        title: "Ranked",
      })
    );
  }

  /**
   * Creates a playlist with all ranked maps.
   * @private
   */
  public static async createQualifiedMapsPlaylist(): Promise<Playlist> {
    const qualifiedLeaderboards = await LeaderboardService.getQualifiedLeaderboards();
    const highlightedIds = qualifiedLeaderboards.map(map => map.id);

    const maps: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of qualifiedLeaderboards) {
      if (maps.has(leaderboard.songHash)) {
        continue;
      }
      maps.set(leaderboard.songHash, leaderboard);
    }

    return this.createScoreSaberPlaylist(
      "scoresaber-qualified-maps",
      `ScoreSaber Qualified Maps (${formatDateMinimal(new Date())})`,
      "ScoreSaber Reloaded",
      maps,
      highlightedIds,
      await this.generatePlaylistImage("SSR", {
        title: "Qualified",
      })
    );
  }

  /**
   * Creates a playlist with all the maps in the ranking queue.
   * @private
   */
  public static async createRankingQueueMapsPlaylist(): Promise<Playlist> {
    const leaderboards: ScoreSaberLeaderboard[] = await fetchWithCache(
      CacheService.getCache(ServiceCache.Leaderboards),
      "ranking-queue-maps",
      async () => {
        const rankingQueueTokens = (await scoresaberService.lookupRankingRequests()) || [];

        const leaderboards: ScoreSaberLeaderboard[] = [];
        for (const rankingQueueToken of rankingQueueTokens) {
          const leaderboard = getScoreSaberLeaderboardFromToken(rankingQueueToken.leaderboardInfo);
          leaderboards.push(leaderboard);
        }
        return leaderboards;
      }
    );

    const highlightedIds = leaderboards.map(map => map.id);
    const maps: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of leaderboards) {
      if (maps.has(leaderboard.songHash)) {
        continue;
      }
      maps.set(leaderboard.songHash, leaderboard);
    }

    return this.createScoreSaberPlaylist(
      "scoresaber-ranking-queue-maps",
      `ScoreSaber Ranking Queue Maps (${formatDateMinimal(new Date())})`,
      "ScoreSaber Reloaded",
      maps,
      highlightedIds,
      await this.generatePlaylistImage("SSR", {
        title: "Ranking Queue",
      })
    );
  }

  /**
   * Creates a ScoreSaber playlist
   *
   * @param id the id of the playlist
   * @param title the title of the playlist
   * @param author the author of the playlist
   * @param maps the maps in the playlist
   * @param selectedDifficulties the leaderboard ids to highlight
   * @param image the image for the playlist
   * @returns the playlist
   * @private
   */
  private static createScoreSaberPlaylist(
    id: string,
    title: string,
    author: string,
    maps: Map<string, ScoreSaberLeaderboard>,
    selectedDifficulties: number[],
    image: string
  ) {
    const uniqueMaps = new Map<string, ScoreSaberLeaderboard>();
    for (const map of maps.values()) {
      const mapId = map.songHash;
      if (!uniqueMaps.has(mapId)) {
        uniqueMaps.set(mapId, map);
      }
    }

    return new Playlist(
      id,
      title,
      author,
      image,
      Array.from(uniqueMaps.values()).map(map => {
        return {
          songName: map.songName,
          songAuthor: map.songAuthorName,
          songHash: map.songHash,
          difficulties: map.difficulties
            .filter(difficulty => selectedDifficulties.includes(difficulty.leaderboardId))
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

  /**
   * Generates a playlist image
   *
   * @param author the author of the playlist
   * @param options the options for the playlist image
   * @returns the base64 encoded image
   */
  private static async generatePlaylistImage(author: string, options: {
    title?: string,
    lines?: ImageTextOptions[]
  }): Promise<string> {
    const image = new SSRImage({
      width: 512,
      height: 512,
    });
    await image.setBackgroundImage("https://cdn.fascinated.cc/cFkchQkc.png");
    image.drawText(
      [
        {
          text: author,
          color: "#000",
          fontSize: 100,
          fontFamily: "SSR",
        },
        // Title
        ...(options.title ? [{
          text: options.title,
          color: "#222222",
          fontSize: 62,
          fontFamily: "SSR",
        }] as ImageTextOptions[] : []),

        // Additional lines
        ...(options.lines || []),
      ],
      "center",
      0.8
    );
    return (await image.build()).toString("base64");
  }
}
