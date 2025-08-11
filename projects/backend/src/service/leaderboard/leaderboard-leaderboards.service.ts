import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { ScoreSaberLeaderboardStarChangeModel } from "@ssr/common/model/leaderboard/leaderboard-star-change";
import { PlaylistSong } from "@ssr/common/playlist/playlist-song";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../../bot/bot";
import { RefreshResult } from "../../common/types/leaderboard";
import CacheService, { CacheId } from "../cache.service";
import PlaylistService from "../playlist/playlist.service";
import { LeaderboardService } from "./leaderboard.service";

export class LeaderboardLeaderboardsService {
  /**
   * Gets the ranked leaderboards based on the options
   */
  public static async getRankedLeaderboards(options?: {
    projection?: { [field: string]: number };
    sort?: "dateRanked" | "stars";
    match?: { [field: string]: unknown };
  }): Promise<ScoreSaberLeaderboard[]> {
    const leaderboards: ScoreSaberLeaderboard[] = await ScoreSaberLeaderboardModel.aggregate([
      { $match: { ranked: true, ...(options?.match ?? {}) } },
      ...(options?.projection
        ? [
            {
              $project: {
                ...options.projection,
                dateRanked: 1,
              },
            },
          ]
        : []),
      { $sort: { dateRanked: -1 } },
    ]);

    return leaderboards.map(leaderboard => LeaderboardService.leaderboardToObject(leaderboard));
  }

  /**
   * Gets all the qualified leaderboards
   */
  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetchWithCache(
      CacheId.Leaderboards,
      "leaderboard:qualified-leaderboards",
      async () => {
        const leaderboards = await ScoreSaberLeaderboardModel.find({ qualified: true }).lean();
        return leaderboards.map(leaderboard => LeaderboardService.leaderboardToObject(leaderboard));
      }
    );
  }

  /**
   * Gets the ranking queue leaderboards
   */
  public static async getRankingQueueLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetchWithCache(
      CacheId.Leaderboards,
      "leaderboard:ranking-queue-maps",
      async () => {
        const rankingQueueTokens = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupRankingRequests();
        if (!rankingQueueTokens) {
          return [];
        }

        return rankingQueueTokens.all.map(token =>
          getScoreSaberLeaderboardFromToken(token.leaderboardInfo)
        );
      }
    );
  }

  /**
   * Refreshes leaderboards with common logic
   */
  public static async refreshLeaderboards(
    fetchFunction: () => Promise<{
      leaderboards: ScoreSaberLeaderboard[];
      rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
    }>,
    playlistId: "scoresaber-ranked-maps" | "scoresaber-qualified-maps",
    playlistTitle: string,
    createPlaylistFunction: () => Promise<{ title: string; image: string; songs: PlaylistSong[] }>
  ): Promise<RefreshResult> {
    Logger.info(`Refreshing ${playlistTitle.toLowerCase()} leaderboards...`);
    const before = Date.now();
    const { leaderboards, rankedMapDiffs } = await fetchFunction();
    const leaderboardUpdates = await LeaderboardService.processLeaderboardUpdates(
      leaderboards,
      rankedMapDiffs
    );

    // Update the playlist
    const playlist = await createPlaylistFunction();
    await PlaylistService.updatePlaylist(playlistId, {
      title: playlist.title,
      image: playlist.image,
      songs: playlist.songs,
    });

    await logToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`Refreshed ${leaderboards.length} ${playlistTitle.toLowerCase()} leaderboards.`)
        .setDescription(
          `Updated ${leaderboardUpdates.updatedScoresCount} scores in ${formatDuration(Date.now() - before)}`
        )
        .setColor("#00ff00")
    );

    return {
      refreshedLeaderboards: leaderboards.length,
      updatedScoresCount: leaderboardUpdates.updatedScoresCount,
      updatedLeaderboardsCount: leaderboardUpdates.updatedLeaderboardsCount,
      updatedLeaderboards: leaderboardUpdates.updatedLeaderboards,
    };
  }

  /**
   * Refreshes the qualified leaderboards
   */
  public static async refreshQualifiedLeaderboards(): Promise<RefreshResult> {
    return this.refreshLeaderboards(
      () => this.fetchAllQualifiedLeaderboards(),
      "scoresaber-qualified-maps",
      "qualified",
      () => PlaylistService.createQualifiedPlaylist()
    );
  }

  /**
   * Refreshes the ranked leaderboards
   */
  public static async refreshRankedLeaderboards(): Promise<RefreshResult> {
    const { leaderboards, rankedMapDiffs } = await this.fetchAllRankedLeaderboards();

    const result = await this.refreshLeaderboards(
      async () => ({ leaderboards, rankedMapDiffs }),
      "scoresaber-ranked-maps",
      "ranked",
      () => PlaylistService.createRankedPlaylist(leaderboards)
    );

    // Handle unranking old leaderboards using the already fetched data
    const unrankedLeaderboards = await LeaderboardService.unrankOldLeaderboards(leaderboards);

    // Get the newly ranked maps, buffed maps, and nerfed maps
    const newlyRankedMaps = result.updatedLeaderboards.filter(
      update => update.update.rankedStatusChanged && update.leaderboard.ranked
    );
    const starRatingChangedMaps = result.updatedLeaderboards.filter(
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

    if (result.updatedLeaderboardsCount > 0 || unrankedLeaderboards.length > 0) {
      // Log the leaderboard updates to Discord
      await LeaderboardService.logLeaderboardUpdates(
        newlyRankedMaps,
        buffedMaps,
        nerfedMaps,
        unrankedLeaderboards
      );

      // Create star change documents for the newly ranked maps, buffed maps, and nerfed maps
      await Promise.all(
        [...newlyRankedMaps, ...buffedMaps, ...nerfedMaps].map(async update => {
          // Create a star change document
          await ScoreSaberLeaderboardStarChangeModel.create({
            leaderboardId: update.leaderboard.id,
            previousStars: update.update.previousLeaderboard?.stars ?? null,
            newStars: update.leaderboard.stars,
            timestamp: new Date(),
          });
        })
      );

      // Create star change documents for the maps that were unranked
      await Promise.all(
        unrankedLeaderboards.map(async leaderboard => {
          // Create a star change document
          await ScoreSaberLeaderboardStarChangeModel.create({
            leaderboardId: leaderboard.id,
            previousStars: leaderboard.stars,
            newStars: 0,
            timestamp: new Date(),
          });
        })
      );
    }

    return result;
  }

  /**
   * Fetches all ranked leaderboards from the ScoreSaber API
   */
  public static async fetchAllRankedLeaderboards(): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
  }> {
    return LeaderboardService.fetchAllLeaderboards({ ranked: true });
  }

  /**
   * Fetches all qualified leaderboards from the ScoreSaber API
   */
  public static async fetchAllQualifiedLeaderboards(): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
  }> {
    return LeaderboardService.fetchAllLeaderboards({ qualified: true });
  }
}
