import cron from "@elysiajs/cron";
import { env } from "@ssr/common/env";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Playlist, PlaylistModel } from "@ssr/common/playlist/playlist";
import { PlaylistSong } from "@ssr/common/playlist/playlist-song";
import { parseCustomRankedPlaylistSettings } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { SnipePlaylist } from "@ssr/common/playlist/snipe/snipe-playlist";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { app } from "..";
import { fetchWithCache } from "../common/cache.util";
import {
  generateCustomRankedPlaylistImage,
  generatePlaylistImage,
  generateSnipePlaylistImage,
} from "../common/playlist.util";
import CacheService, { ServiceCache } from "./cache.service";
import { PlayerCoreService } from "./player/player-core.service";
import { ScoreService } from "./score/score.service";
import LeaderboardService from "./scoresaber/leaderboard.service";
import ScoreSaberService from "./scoresaber/scoresaber.service";

export type SnipeType = "top" | "recent";
export type PlaylistId =
  | "scoresaber-ranked-maps"
  | "scoresaber-qualified-maps"
  | "scoresaber-ranking-queue-maps"
  | "scoresaber-custom-ranked-maps"
  | (string & { __brand: "PlaylistId" });

export default class PlaylistService {
  constructor() {
    app.use(
      cron({
        name: "update-ranking-queue-playlist",
        pattern: "0 */2 * * *", // Every 2 hours at 00:00, 02:00, 04:00, etc
        timezone: "Europe/London",
        protect: true,
        run: async () => {
          const playlist = await PlaylistService.createPlaylistByType(
            "scoresaber-ranking-queue-maps"
          );
          await PlaylistService.updatePlaylist("scoresaber-ranking-queue-maps", {
            title: playlist.title,
            image: playlist.image,
            songs: playlist.songs,
          });
        },
      })
    );

    this.initializeDefaultPlaylists();
  }
  /**
   * Initializes the default playlists if they don't exist
   * @private
   */
  private async initializeDefaultPlaylists() {
    try {
      const defaultPlaylists: PlaylistId[] = [
        "scoresaber-ranked-maps",
        "scoresaber-qualified-maps",
        "scoresaber-ranking-queue-maps",
      ];

      for (const playlistId of defaultPlaylists) {
        const playlist = await PlaylistModel.findOne({ id: playlistId });
        if (!playlist) {
          Logger.info(`[PlaylistService] Creating default playlist: ${playlistId}`);
          const createdPlaylist = await PlaylistService.createPlaylistByType(playlistId);
          await PlaylistService.createPlaylist(createdPlaylist);
        }
      }
    } catch (error) {
      Logger.error(`[PlaylistService] Failed to initialize default playlists: ${error}`);
    }
  }

  /**
   * Creates a playlist based on the provided type and configuration
   * @private
   */
  public static async createPlaylistByType(type: PlaylistId, config?: string): Promise<Playlist> {
    switch (type) {
      case "scoresaber-ranked-maps": {
        const leaderboards = await LeaderboardService.getRankedLeaderboards();
        return await this.createRankedPlaylist(leaderboards);
      }
      case "scoresaber-qualified-maps":
        return await this.createQualifiedPlaylist();
      case "scoresaber-ranking-queue-maps":
        return await this.createRankingQueuePlaylist();
      case "scoresaber-custom-ranked-maps":
        return await this.createCustomRankedPlaylist(config);
      default:
        throw new BadRequestError(`Invalid playlist type: ${type}`);
    }
  }

  /**
   * Creates a playlist for ranked maps
   * @private
   */
  public static async createRankedPlaylist(
    leaderboards: ScoreSaberLeaderboard[]
  ): Promise<Playlist> {
    const title = `ScoreSaber Ranked Maps (${formatDateMinimal(new Date())})`;
    const imageTitle = "Ranked";
    const highlightedIds = leaderboards.map(map => map.id);

    const { maps } = this.processLeaderboards(leaderboards);
    const image = await generatePlaylistImage("SSR", { title: imageTitle });

    return this.createScoreSaberPlaylist(
      "scoresaber-ranked-maps",
      title,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      maps,
      highlightedIds,
      image
    );
  }

  /**
   * Creates a playlist for qualified maps
   * @private
   */
  private static async createQualifiedPlaylist(): Promise<Playlist> {
    const leaderboards = await LeaderboardService.getQualifiedLeaderboards();
    const title = `ScoreSaber Qualified Maps (${formatDateMinimal(new Date())})`;
    const imageTitle = "Qualified";

    const highlightedIds = [...leaderboards.map(map => map.id)];
    for (const map of leaderboards) {
      if (!map.ranked) {
        for (const difficulty of map.difficulties) {
          highlightedIds.push(difficulty.leaderboardId);
        }
      }
    }
    const uniqueHighlightedIds = [...new Set(highlightedIds)];

    const { maps } = this.processLeaderboards(leaderboards);
    const image = await generatePlaylistImage("SSR", { title: imageTitle });

    return this.createScoreSaberPlaylist(
      "scoresaber-qualified-maps",
      title,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      maps,
      uniqueHighlightedIds,
      image
    );
  }

  /**
   * Creates a playlist for ranking queue maps
   * @private
   */
  private static async createRankingQueuePlaylist(): Promise<Playlist> {
    const leaderboards = await fetchWithCache(
      CacheService.getCache(ServiceCache.Leaderboards),
      "ranking-queue-maps",
      async () => {
        const rankingQueueTokens = await scoresaberService.lookupRankingRequests();
        if (!rankingQueueTokens) {
          return [];
        }

        return rankingQueueTokens.all.map(token =>
          getScoreSaberLeaderboardFromToken(token.leaderboardInfo)
        );
      }
    );

    const title = `ScoreSaber Ranking Queue Maps (${formatDateMinimal(new Date())})`;
    const imageTitle = "Ranking Queue";
    const highlightedIds = leaderboards.map(map => map.id);

    const { maps } = this.processLeaderboards(leaderboards);
    const image = await generatePlaylistImage("SSR", { title: imageTitle });

    return this.createScoreSaberPlaylist(
      "scoresaber-ranking-queue-maps",
      title,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      maps,
      highlightedIds,
      image
    );
  }

  /**
   * Creates a playlist for custom ranked maps
   * @private
   */
  private static async createCustomRankedPlaylist(config?: string): Promise<Playlist> {
    if (!config) {
      throw new BadRequestError("Config is required for custom ranked playlists");
    }

    const parsedConfig = parseCustomRankedPlaylistSettings(config);
    const leaderboards = await LeaderboardService.getRankedLeaderboards({
      sort: parsedConfig.sort,
      match: {
        stars: {
          $gte: parsedConfig.stars.min,
          $lte: parsedConfig.stars.max,
        },
      },
    });

    const title = `Custom Ranked Maps (${formatDateMinimal(new Date())})`;
    const { maps, highlightedIds } = this.processLeaderboards(leaderboards);
    const image = await generateCustomRankedPlaylistImage(parsedConfig);

    return this.createScoreSaberPlaylist(
      "scoresaber-custom-ranked-maps",
      title,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      maps,
      highlightedIds,
      image
    );
  }

  /**
   * Gets a playlist by ID
   *
   * @param playlistId the ID of the playlist to get
   * @param config optional configuration for custom playlists
   * @returns the requested playlist
   */
  public static async getPlaylist(playlistId: PlaylistId, config?: string): Promise<Playlist> {
    if (playlistId === "scoresaber-custom-ranked-maps") {
      return await this.createPlaylistByType("scoresaber-custom-ranked-maps", config);
    }

    const playlist = await PlaylistModel.findOne({ id: playlistId });
    if (!playlist) {
      throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
    }
    return playlist;
  }

  /**
   * Updates a playlist with new data
   *
   * @param playlistId the ID of the playlist to update
   * @param options the new data for the playlist
   */
  public static async updatePlaylist(
    playlistId: PlaylistId,
    options: {
      title?: string;
      author?: string;
      image?: string;
      songs?: PlaylistSong[];
    }
  ) {
    const playlist = await PlaylistModel.findOne({ id: playlistId });
    if (!playlist) {
      throw new BadRequestError(`Playlist with id ${playlistId} does not exist`);
    }

    Object.assign(playlist, options);
    await playlist.save();
  }

  /**
   * Creates a playlist
   *
   * @param playlist the playlist to create
   */
  public static async createPlaylist(playlist: Playlist) {
    const existingPlaylist = await PlaylistModel.findOne({ id: playlist.id });
    if (existingPlaylist) {
      throw new BadRequestError(`Playlist with id ${playlist.id} already exists`);
    }

    await PlaylistModel.create(playlist);
    return playlist;
  }

  /**
   * Creates a snipe playlist for a user
   *
   * @param user the user who is sniping
   * @param toSnipe the user being sniped
   * @param type the type of snipe (top or recent)
   * @param settingsBase64 optional base64 encoded settings
   * @returns the created snipe playlist
   */
  public static async getSnipePlaylist(
    user: string,
    toSnipe: string,
    type: SnipeType,
    settingsBase64?: string
  ): Promise<Playlist> {
    const settings = parseSnipePlaylistSettings(settingsBase64, type);
    type = settings?.sort || type;

    if (type !== "top" && type !== "recent") {
      throw new BadRequestError("Invalid snipe type");
    }

    try {
      // Validate users exist
      if (
        !(await PlayerCoreService.playerExists(user)) ||
        !(await PlayerCoreService.playerExists(toSnipe))
      ) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as one of the users isn't tracked.`
        );
      }

      // Get and filter scores
      const rawScores = await ScoreService.getPlayerScores(toSnipe, {
        includeLeaderboard: true,
        projection: {
          pp: 1,
          accuracy: 1,
          timestamp: 1,
        },
      });

      if (rawScores.length === 0) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as they have no scores.`
        );
      }

      const filteredScores = rawScores
        .map(playerScore => ({
          score: playerScore.score as ScoreSaberScore,
          leaderboard: playerScore.leaderboard,
        }))
        .filter(({ score, leaderboard }) => {
          if (!leaderboard) return false;

          if (settings?.starRange?.min && settings?.starRange?.max && leaderboard.stars > 0) {
            if (
              leaderboard.stars < settings.starRange.min ||
              leaderboard.stars > settings.starRange.max
            ) {
              return false;
            }
          }

          if (settings?.accuracyRange?.min && settings?.accuracyRange?.max) {
            if (
              score.accuracy < settings.accuracyRange.min ||
              score.accuracy > settings.accuracyRange.max
            ) {
              return false;
            }
          }

          return true;
        });

      const toSnipePlayer = await ScoreSaberService.getPlayer(toSnipe);
      const formattedScores = filteredScores
        .sort((a, b) => {
          if (type === "top") {
            return b.score.pp - a.score.pp;
          }
          return b.score.timestamp.getTime() - a.score.timestamp.getTime();
        })
        .slice(0, settings.limit)
        .map(({ score, leaderboard }) => ({
          songName: leaderboard.songName,
          songAuthor: leaderboard.songAuthorName,
          songHash: leaderboard.songHash,
          difficulties: leaderboard.difficulties
            .filter(difficulty => difficulty.leaderboardId === score.leaderboardId)
            .map(difficulty => ({
              difficulty: difficulty.difficulty,
              characteristic: difficulty.characteristic,
            })),
        }));

      return new SnipePlaylist(
        toSnipe,
        user,
        type,
        settings,
        `Snipe - ${truncateText(toSnipePlayer.name, 16)} (${capitalizeFirstLetter(settings.sort)})`,
        formattedScores,
        await generateSnipePlaylistImage(settings, toSnipePlayer)
      );
    } catch (error) {
      Logger.error("Error creating snipe playlist", error);
      throw new InternalServerError((error as Error).message);
    }
  }

  /**
   * Processes leaderboards into maps and highlighted IDs
   * @private
   */
  public static processLeaderboards(leaderboards: ScoreSaberLeaderboard[]) {
    const maps = new Map<string, ScoreSaberLeaderboard>();
    for (const leaderboard of leaderboards) {
      if (!maps.has(leaderboard.songHash)) {
        maps.set(leaderboard.songHash, leaderboard);
      }
    }

    return {
      maps,
      highlightedIds: leaderboards.map(map => map.id),
    };
  }

  /**
   * Creates a ScoreSaber playlist
   * @private
   */
  public static createScoreSaberPlaylist(
    id: string,
    title: string,
    author: string,
    maps: Map<string, ScoreSaberLeaderboard>,
    selectedDifficulties: number[],
    image: string,
    category?: "ranked-batch"
  ): Playlist {
    return new Playlist(
      id,
      title,
      author,
      image,
      Array.from(maps.values()).map(map => ({
        songName: map.songName,
        songAuthor: map.songAuthorName,
        songHash: map.songHash,
        difficulties: map.difficulties
          .filter(difficulty => selectedDifficulties.includes(difficulty.leaderboardId))
          .map(difficulty => ({
            difficulty: difficulty.difficulty,
            characteristic: difficulty.characteristic,
          })),
      })),
      category
    );
  }
}
