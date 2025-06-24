import { Consts } from "@ssr/common/consts";
import { env } from "@ssr/common/env";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Playlist, PlaylistModel } from "@ssr/common/playlist/playlist";
import { parseCustomRankedPlaylistSettings } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { SnipePlaylist } from "@ssr/common/playlist/snipe/snipe-playlist";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import {
  generateCustomRankedPlaylistImage,
  generatePlaylistImage,
  generateSnipePlaylistImage,
} from "../../common/playlist.util";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PlayerService } from "../player/player.service";
import ScoreSaberService from "../scoresaber.service";

export type SnipeType = "top" | "recent";

export type PlaylistId =
  | "scoresaber-ranked-maps"
  | "scoresaber-qualified-maps"
  | "scoresaber-ranking-queue-maps"
  | "scoresaber-custom-ranked-maps";

export default class PlaylistService {
  /**
   * Initializes the default playlists if they don't exist
   * @private
   */
  private async initializeDefaultPlaylists() {
    const defaultPlaylists = {
      "scoresaber-ranked-maps": PlaylistService.createRankedPlaylist,
      "scoresaber-qualified-maps": PlaylistService.createQualifiedPlaylist,
      "scoresaber-ranking-queue-maps": PlaylistService.createRankingQueuePlaylist,
    } as const;

    const results = await Promise.allSettled(
      Object.entries(defaultPlaylists).map(async ([playlistId, createFn]) => {
        try {
          const existingPlaylist = await PlaylistModel.findOne({ id: playlistId });
          if (existingPlaylist) {
            return;
          }

          Logger.info(`[PlaylistService] Creating default playlist: ${playlistId}`);
          const createdPlaylist = await createFn();
          await PlaylistService.createPlaylist(createdPlaylist);
          Logger.info(`[PlaylistService] Successfully created playlist: ${playlistId}`);
        } catch (error) {
          Logger.error(`[PlaylistService] Failed to create playlist ${playlistId}:`, error);
          throw error; // Re-throw to be caught by Promise.allSettled
        }
      })
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const playlistId = Object.keys(defaultPlaylists)[index];
        Logger.error(
          `[PlaylistService] Failed to initialize playlist ${playlistId}:`,
          result.reason
        );
      }
    });
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
      return await this.createCustomRankedPlaylist(config);
    }

    const playlist = await PlaylistModel.findOne({ id: playlistId });
    if (!playlist) {
      throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
    }
    return playlist;
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
   * Updates a playlist
   *
   * @param playlistId the ID of the playlist to update
   * @param updates the updates to apply
   */
  public static async updatePlaylist(playlistId: string, updates: Partial<Playlist>) {
    const playlist = await PlaylistModel.findOne({ id: playlistId });
    if (!playlist) {
      throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
    }

    await PlaylistModel.updateOne({ id: playlistId }, updates);
    return playlist;
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
   * Creates a playlist for ranked maps
   *
   * @param leaderboards the leaderboards to use, if not provided, all ranked leaderboards will be used
   * @returns the created playlist
   */
  public static async createRankedPlaylist(
    leaderboards?: ScoreSaberLeaderboard[]
  ): Promise<Playlist> {
    if (!leaderboards) {
      leaderboards = await LeaderboardService.getRankedLeaderboards();
    }

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
  public static async createQualifiedPlaylist(
    leaderboards?: ScoreSaberLeaderboard[]
  ): Promise<Playlist> {
    if (!leaderboards) {
      leaderboards = await LeaderboardService.getQualifiedLeaderboards();
    }

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
   */
  public static async createRankingQueuePlaylist(): Promise<Playlist> {
    const leaderboards = await LeaderboardService.getRankingQueueLeaderboards();
    const { maps } = this.processLeaderboards(leaderboards);
    const highlightedIds = leaderboards.map(map => map.id);

    const title = `ScoreSaber Ranking Queue Maps (${formatDateMinimal(new Date())})`;
    const imageTitle = "Ranking Queue";
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
    settingsBase64?: string
  ): Promise<Playlist> {
    const settings = parseSnipePlaylistSettings(settingsBase64);

    try {
      // Validate users exist
      if (
        !(await PlayerService.playerExists(user)) ||
        !(await PlayerService.playerExists(toSnipe))
      ) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as one of the users isn't tracked.`
        );
      }

      // Get and filter scores
      const rawScores = await PlayerService.getPlayerScores(toSnipe, {
        projection: {
          pp: 1,
          accuracy: 1,
          timestamp: 1,
          leaderboardId: 1,
          playerId: 1,
        },
        sort: {
          field: settings?.sort || "pp",
          direction: settings?.sortDirection || "desc",
        },
        insertScoreData: false,
      });
      if (rawScores.length === 0) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as they have no scores.`
        );
      }

      // Apply some filters early to reduce the amount of leaderboards we need to fetch
      const scores = rawScores.filter(({ score }) => {
        // Apply ranked status filtering
        if (settings?.rankedStatus === "ranked" && score.pp <= 0) return false;
        if (settings?.rankedStatus === "unranked" && score.pp > 0) return false;

        // Apply accuracy range filtering
        if (
          settings?.accuracyRange?.min !== undefined &&
          settings?.accuracyRange?.max !== undefined
        ) {
          if (
            score.accuracy < settings.accuracyRange.min ||
            score.accuracy > settings.accuracyRange.max
          ) {
            return false;
          }
        }

        return true;
      });

      // Fetch leaderboards for the scores
      const leaderboards = await LeaderboardService.getLeaderboards(
        scores.map(({ score }) => score.leaderboardId.toString()),
        {
          cacheOnly: true,
          includeBeatSaver: false,
        }
      );

      // Star range filtering
      const filteredScores = scores
        .map(playerScore => ({
          score: playerScore.score as ScoreSaberScore,
          leaderboard: leaderboards.find(
            leaderboard => leaderboard.leaderboard.id == playerScore.score.leaderboardId
          )?.leaderboard,
        }))
        .filter(({ leaderboard }) => {
          if (!leaderboard) return false;

          // Apply star range filtering if star range is specified and leaderboard has valid stars
          if (
            settings?.starRange?.min !== undefined &&
            settings?.starRange?.max !== undefined &&
            leaderboard.stars > 0 &&
            leaderboard.stars <= Consts.MAX_STARS
          ) {
            if (
              leaderboard.stars < settings.starRange.min ||
              leaderboard.stars > settings.starRange.max
            ) {
              return false;
            }
          }

          return true;
        });

      // Format the scores
      const toSnipePlayer = await ScoreSaberService.getPlayer(toSnipe);
      const formattedScores = filteredScores
        .slice(0, settings.limit)
        .map(({ score, leaderboard }) => {
          const matchingDifficulties = leaderboard!.difficulties.filter(
            difficulty => difficulty.leaderboardId === score.leaderboardId
          );
          return {
            songName: leaderboard!.songName,
            songAuthor: leaderboard!.songAuthorName,
            songHash: leaderboard!.songHash,
            difficulties: matchingDifficulties.map(difficulty => ({
              difficulty: difficulty.difficulty,
              characteristic: difficulty.characteristic,
            })),
          };
        })
        .filter(song => song.difficulties.length > 0);

      return new SnipePlaylist(
        toSnipe,
        user,
        settings,
        settings.name ||
          `Snipe - ${truncateText(toSnipePlayer.name, 16)} (${capitalizeFirstLetter(settings.sort || "pp")})`,
        formattedScores,
        await generateSnipePlaylistImage(settings, toSnipePlayer)
      );
    } catch (error) {
      Logger.error("Error creating snipe playlist", error);
      throw new InternalServerError((error as Error).message);
    }
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
