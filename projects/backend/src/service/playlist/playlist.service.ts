import { env } from "@ssr/common/env";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import {
  CustomRankedPlaylist,
  parseCustomRankedPlaylistSettings,
} from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import type { SelfPlaylistSettings } from "@ssr/common/playlist/self/self-playlist-settings-schema";
import { parseSelfPlaylistSettings } from "@ssr/common/playlist/self/self-playlist-utils";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { parseSchema } from "@ssr/common/schemas/parse";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardQueryCategory } from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import type { SuggestedMapsPlaylistQuery } from "@ssr/common/schemas/suggested-maps/suggested-maps-route";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import type { SnipeSettings } from "@ssr/common/snipe/snipe-settings-schema";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { Type, type Static } from "typebox";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import {
  ScoreSaberScoresRepository,
  type PlaylistScoreFilters,
} from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { PlayerCoreService } from "../player/player-core.service";
import { RankedBatchService } from "../ranked-batch/ranked-batch.service";
import { SuggestedMapsService } from "../suggested-maps/suggested-maps.service";
import { groupPlaylistSongs, takeTopUniqueSongRows } from "./playlist-song-utils";
import { buildRankedBatchPlaylist } from "./ranked-batch-playlist";
import { DEFAULT_PLAYLIST_SIZE, buildSuggestedMapsPlaylist } from "./suggested-maps-playlist";

function getPlaylistTitleDate(date: Date) {
  return formatDate(date, "MMM D, YYYY");
}

function getSelfSnipePlaylistTitle({
  name,
  settings,
  date = new Date(),
}: {
  name: string;
  settings: SelfPlaylistSettings | SnipeSettings;
  date?: Date;
}) {
  const parts = [
    `${capitalizeFirstLetter(settings.sort || "pp")} (${settings.sortDirection || "desc"})`,
    `${settings.starRange?.min} - ${settings.starRange?.max} stars`,
    `${settings.accuracyRange?.min} - ${settings.accuracyRange?.max}% accuracy`,
  ];
  if (settings.limit !== undefined) {
    parts.push(`Top ${settings.limit}`);
  }
  parts.push(getPlaylistTitleDate(date));
  return `${name} (${parts.join(", ")})`;
}

const customRankedSortLabels: Record<CustomRankedPlaylist["sort"], string> = {
  stars: "by stars",
  dateRanked: "by date ranked",
  plays: "by plays",
  dailyPlays: "by daily plays",
};

const BasePlaylistIds = Type.Union([
  Type.Literal("scoresaber-ranked-maps"),
  Type.Literal("scoresaber-qualified-maps"),
  Type.Literal("scoresaber-ranking-queue-maps"),
  Type.Literal("scoresaber-trending"),
]);

export const PlaylistIdsSchema = Type.Union([
  BasePlaylistIds,
  Type.TemplateLiteral([BasePlaylistIds, Type.Literal(".bplist")]),
  Type.TemplateLiteral([BasePlaylistIds, Type.Literal(".json")]),
]);

export type PlaylistId = Static<typeof PlaylistIdsSchema>;

export default class PlaylistService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Playlists");

  /**
   * Gets a playlist by id
   *
   * @param id the id of the playlist
   * @returns the playlist
   */
  public static async getPlaylist(id: PlaylistId) {
    const playlistId = parseSchema(PlaylistIdsSchema, id);
    const parts = playlistId.split(".");
    const normalizedPlaylistId = parts[0];

    switch (normalizedPlaylistId) {
      case "scoresaber-ranked-maps":
        return await PlaylistService.getRankedMapsPlaylist();
      case "scoresaber-qualified-maps":
        return await PlaylistService.getQualifiedMapsPlaylist();
      case "scoresaber-ranking-queue-maps":
        return await PlaylistService.getRankingQueueMapsPlaylist();
      case "scoresaber-trending":
        return await PlaylistService.getTopTrendingMapsPlaylist();
    }
    throw new NotFoundError(`Playlist ${id} not found`);
  }

  /**
   * Gets the ranked maps playlist
   *
   * @returns the ranked maps playlist
   */
  public static async getRankedMapsPlaylist() {
    const songs = groupPlaylistSongs(
      await ScoreSaberLeaderboardsRepository.getPlaylistEntries({ ranked: true }, DEFAULT_REALM_ID)
    );

    return {
      playlistTitle: `ScoreSaber Ranked (${getPlaylistTitleDate(new Date())})`,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/scoresaber-ranked-maps.bplist`,
      },
      songs,
    };
  }

  /**
   * Gets the qualified maps playlist
   *
   * @returns the qualified maps playlist
   */
  public static async getQualifiedMapsPlaylist() {
    const songs = groupPlaylistSongs(
      await ScoreSaberLeaderboardsRepository.getPlaylistEntries({ qualified: true }, DEFAULT_REALM_ID)
    );

    return {
      playlistTitle: `ScoreSaber Qualified (${getPlaylistTitleDate(new Date())})`,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/scoresaber-qualified-maps.bplist`,
      },
      songs,
    };
  }

  /**
   * Gets the ranking queue maps playlist
   *
   * @returns the ranking queue maps playlist
   */
  public static async getRankingQueueMapsPlaylist() {
    const rankingQueueLeaderboards = await ScoreSaberLeaderboardsService.getRankingQueueLeaderboards();
    const leaderboards: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of rankingQueueLeaderboards.all) {
      if (!leaderboards.has(leaderboard.songHash)) {
        leaderboards.set(leaderboard.songHash, { ...leaderboard, difficulties: [] });
      }
      leaderboards.get(leaderboard.songHash)!.difficulties.push(leaderboard.difficulty);
    }

    return {
      playlistTitle: `ScoreSaber Ranking Queue (${getPlaylistTitleDate(new Date())})`,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/scoresaber-ranking-queue-maps.bplist`,
      },
      songs: Array.from(leaderboards.values()).map(leaderboard => ({
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    };
  }

  /**
   * Gets the top trending leaderboards playlist.
   *
   * @returns the top trending leaderboards playlist
   */
  public static async getTopTrendingMapsPlaylist() {
    const trendingLeaderboards = await ScoreSaberLeaderboardsRepository.getTopTrendingLeaderboards(
      150,
      DEFAULT_REALM_ID
    );
    const leaderboards: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of trendingLeaderboards) {
      if (!leaderboards.has(leaderboard.songHash)) {
        leaderboards.set(leaderboard.songHash, { ...leaderboard, difficulties: [] });
      }
      leaderboards.get(leaderboard.songHash)!.difficulties.push(leaderboard.difficulty);
    }

    return {
      playlistTitle: `ScoreSaber Trending (${getPlaylistTitleDate(new Date())})`,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/scoresaber-trending.bplist`,
      },
      songs: Array.from(leaderboards.values()).map(leaderboard => ({
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    };
  }

  /**
   * Creates a playlist of the maps a ranked batch re-rated or ranked that are still ranked
   *
   * @param rankedBatchId the id of the ranked batch
   * @returns the ranked batch playlist
   * @throws NotFoundError if the ranked batch does not exist
   */
  public static async getRankedBatchPlaylist(rankedBatchId: number) {
    const { rankedBatch, leaderboards, newLeaderboards } =
      await RankedBatchService.getRankedBatch(rankedBatchId);

    return buildRankedBatchPlaylist(rankedBatch, leaderboards, newLeaderboards);
  }

  /**
   * Gets the playlist of a player's best suggested maps
   *
   * @param playerId the player to suggest maps for
   * @param filters the suggested maps filters; the player's own style fills in what is not set
   * @returns the suggested maps playlist, synced from the suggested maps playlist endpoint
   */
  public static async getSuggestedMapsPlaylist(playerId: string, filters: SuggestedMapsPlaylistQuery = {}) {
    const { maps } = await SuggestedMapsService.getSuggestedMaps({
      ...filters,
      playerId,
      limit: filters.limit ?? DEFAULT_PLAYLIST_SIZE,
    });
    return buildSuggestedMapsPlaylist(playerId, maps, filters);
  }

  /**
   * Creates a playlist for custom ranked maps
   *
   * @param config the configuration for the custom ranked playlist
   * @returns the created custom ranked playlist
   */
  public static async createCustomRankedPlaylist(settingsBase64?: string) {
    const parsedConfig = parseCustomRankedPlaylistSettings(settingsBase64);
    const sort: Record<CustomRankedPlaylist["sort"], ScoreSaberLeaderboardQueryCategory> = {
      stars: "star_difficulty",
      dateRanked: "date_ranked",
      plays: "plays",
      dailyPlays: "daily_plays",
    };
    const entries = await ScoreSaberLeaderboardsRepository.getPlaylistEntries(
      {
        ranked: true,
        minStars: parsedConfig.stars.min,
        maxStars: parsedConfig.stars.max,
        category: sort[parsedConfig.sort] ?? "date_ranked",
      },
      DEFAULT_REALM_ID
    );
    const songs = groupPlaylistSongs(
      entries.map(entry => ({ ...entry, songHash: entry.songHash.toUpperCase() }))
    );

    return {
      playlistTitle: `ScoreSaber Custom (${parsedConfig.stars.min} - ${parsedConfig.stars.max} stars, ${
        customRankedSortLabels[parsedConfig.sort]
      }, ${getPlaylistTitleDate(new Date())})`,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/scoresaber-custom-ranked-maps.bplist?config=${encodeURIComponent(settingsBase64 ?? "")}`,
      },
      songs,
    };
  }

  /**
   * Creates a self playlist for a user
   *
   * @param user the user to create the playlist for
   * @param settingsBase64 optional base64 encoded settings
   * @returns the created self playlist
   */
  public static async getSelfPlaylist(user: string, settingsBase64?: string) {
    const settings = parseSelfPlaylistSettings(settingsBase64);

    try {
      if (!(await PlayerCoreService.playerExists(user))) {
        throw new NotFoundError(`Unable to create a self playlist as the user isn't tracked.`);
      }

      const filters = {
        rankedStatus: settings.rankedStatus,
        starRange: settings.starRange,
      } satisfies PlaylistScoreFilters;

      const entries = await ScoreSaberScoresRepository.selectPlaylistScoreEntries(
        user,
        { ...filters, accuracyRange: settings.accuracyRange },
        settings.sort ?? "pp",
        settings.sortDirection ?? "desc",
        DEFAULT_REALM_ID
      );

      if (entries.length === 0) {
        if (await ScoreSaberScoresRepository.hasPlaylistScores(user, filters, DEFAULT_REALM_ID)) {
          throw new NotFoundError(`Unable to create a self playlist as no scores match the filters.`);
        }
        throw new NotFoundError(`Unable to create a self playlist as the user has no scores.`);
      }

      const songs = groupPlaylistSongs(takeTopUniqueSongRows(entries, settings.limit));

      return {
        playlistTitle: getSelfSnipePlaylistTitle({ name: "Self Playlist", settings }),
        playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
        customData: {
          syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/self.bplist?user=${encodeURIComponent(user)}${settingsBase64 ? `&settings=${encodeURIComponent(settingsBase64)}` : ""}`,
        },
        songs,
      };
    } catch (error) {
      PlaylistService.logger.error("Error creating self playlist", error);
      throw error;
    }
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
  public static async getSnipePlaylist(user: string, toSnipe: string, settingsBase64?: string) {
    const settings = parseSnipePlaylistSettings(settingsBase64);

    if (user === toSnipe) {
      throw new BadRequestError("You cannot snipe yourself");
    }

    try {
      if (!(await PlayerCoreService.playerExists(user)) || !(await PlayerCoreService.playerExists(toSnipe))) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as one of the users isn't tracked.`
        );
      }

      const filters = {
        rankedStatus: settings.rankedStatus,
        starRange: settings.starRange,
      } satisfies PlaylistScoreFilters;

      const [userScores, toSnipeScores] = await Promise.all([
        ScoreSaberScoresRepository.selectPlaylistScoreValues(user, filters, DEFAULT_REALM_ID),
        ScoreSaberScoresRepository.selectPlaylistScoreEntries(
          toSnipe,
          { ...filters, accuracyRange: settings.accuracyRange },
          settings.sort ?? "pp",
          settings.sortDirection ?? "desc",
          DEFAULT_REALM_ID
        ),
      ]);

      if (userScores.length === 0) {
        throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as they have no scores.`);
      }

      if (
        toSnipeScores.length === 0 &&
        !(await ScoreSaberScoresRepository.hasPlaylistScores(toSnipe, filters, DEFAULT_REALM_ID))
      ) {
        throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as they have no scores.`);
      }

      const userScoreByLeaderboard = new Map<number, number>();
      for (const userScore of userScores) {
        userScoreByLeaderboard.set(userScore.leaderboardId, userScore.score);
      }

      const filteredScores = toSnipeScores.filter(toSnipeScore => {
        const userScore = userScoreByLeaderboard.get(toSnipeScore.leaderboardId);
        if (userScore === undefined) {
          return !settings.requireBothScores;
        }
        return toSnipeScore.score > userScore;
      });

      const player = await PlayerCoreService.getAccount(toSnipe);
      if (!player) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as the user isn't tracked.`
        );
      }

      const songs = groupPlaylistSongs(takeTopUniqueSongRows(filteredScores, settings.limit));

      return {
        playlistTitle: getSelfSnipePlaylistTitle({
          name: truncateText(player.name ?? "", 16) ?? "",
          settings,
        }),
        playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
        customData: {
          syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/snipe.bplist?user=${encodeURIComponent(user)}&toSnipe=${encodeURIComponent(toSnipe)}${settingsBase64 ? `&settings=${encodeURIComponent(settingsBase64)}` : ""}`,
        },
        songs,
      };
    } catch (error) {
      PlaylistService.logger.error("Error creating snipe playlist", error);
      throw error;
    }
  }
}
