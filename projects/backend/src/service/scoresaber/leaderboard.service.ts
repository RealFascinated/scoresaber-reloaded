import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberScoreDocument,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate, formatDateMinimal, formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { NotFoundError } from "elysia";
import { DiscordChannels, logToChannel, sendFile } from "../../bot/bot";
import { fetchWithCache } from "../../common/cache.util";
import { generatePlaylistImage } from "../../common/playlist.util";
import BeatSaverService from "../beatsaver.service";
import CacheService, { ServiceCache } from "../cache.service";
import PlaylistService from "../playlist.service";

const CACHE_REFRESH_TIME = 1000 * 60 * 60 * 12; // 12 hours

type RefreshResult = {
  refreshedLeaderboards: number;
  updatedScoresCount: number;
  updatedLeaderboardsCount: number;
};

type LeaderboardUpdate = {
  leaderboard: ScoreSaberLeaderboard;
  previousLeaderboard: ScoreSaberLeaderboard;
  rankedStatusChanged: boolean;
  starCountChanged: boolean;
  qualifiedStatusChanged: boolean;
};

type LeaderboardUpdates = {
  updatedScoresCount: number;
  updatedLeaderboardsCount: number;
  updatedLeaderboards: {
    leaderboard: ScoreSaberLeaderboard;
    update: LeaderboardUpdate;
  }[];
};

export default class LeaderboardService {
  /**
   * Checks if a cached leaderboard should be used based on ranking and refresh time
   *
   * @param cachedLeaderboard the cached leaderboard document
   * @param options fetch options
   * @returns object containing whether to use cache and if document was found
   */
  private static validateCachedLeaderboard(
    cachedLeaderboard: ScoreSaberLeaderboard | null,
    options?: { cacheOnly?: boolean }
  ): { cached: boolean; foundLeaderboard?: ScoreSaberLeaderboard } {
    if (cachedLeaderboard === null) {
      return { cached: false };
    }

    const now = new Date();

    // Use cache if:
    // 1. The map is ranked
    // 2. We're requested to only use cache
    // 3. The cache is fresh (less than 12 hours old)
    if (
      cachedLeaderboard.ranked ||
      options?.cacheOnly ||
      (cachedLeaderboard.lastRefreshed &&
        now.getTime() - cachedLeaderboard.lastRefreshed.getTime() < CACHE_REFRESH_TIME)
    ) {
      return {
        cached: true,
        foundLeaderboard: cachedLeaderboard,
      };
    }

    return { cached: true };
  }

  /**
   * Gets a ScoreSaber leaderboard by ID.
   *
   * @param id the leaderboard id
   * @param options the fetch options
   * @returns the scores
   */
  public static async getLeaderboard(
    id: string,
    options?: {
      cacheOnly?: boolean;
      includeBeatSaver?: boolean;
      beatSaverType?: DetailType;
    }
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    options = {
      includeBeatSaver: true,
      beatSaverType: DetailType.BASIC,
      ...options,
    };
    const cacheKey = `${id}-${options.beatSaverType}`;

    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), cacheKey, async () => {
      // Use index hint for faster query
      const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id)
        .hint({ _id: 1 })
        .lean();

      const { cached, foundLeaderboard } = this.validateCachedLeaderboard(
        cachedLeaderboard,
        options
      );

      let leaderboard = foundLeaderboard;
      if (!leaderboard) {
        const leaderboardToken = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboard(id);
        if (leaderboardToken == undefined) {
          throw new NotFoundError(`Leaderboard not found for "${id}"`);
        }

        leaderboard = await LeaderboardService.saveLeaderboard(
          id,
          getScoreSaberLeaderboardFromToken(leaderboardToken)
        );
      }

      // Start BeatSaver fetch early in parallel if needed
      const beatSaverPromise = options.includeBeatSaver
        ? BeatSaverService.getMap(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic,
            options.beatSaverType ?? DetailType.BASIC
          )
        : Promise.resolve(undefined);

      // Process leaderboard while BeatSaver data is being fetched
      const processedLeaderboard = this.leaderboardToObject(leaderboard);
      if (!processedLeaderboard.fullName) {
        processedLeaderboard.fullName =
          `${processedLeaderboard.songName} ${processedLeaderboard.songSubName}`.trim();
      }

      // Wait for BeatSaver data
      const beatSaverMap = await beatSaverPromise;

      return {
        leaderboard: processedLeaderboard as ScoreSaberLeaderboard,
        beatsaver: beatSaverMap,
        cached: cached,
      };
    });
  }

  /**
   * Gets a ScoreSaber leaderboard by hash.
   *
   * @param hash the leaderboard hash
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   * @param options the fetch options
   * @returns the scores
   */
  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    options?: {
      cacheOnly?: boolean;
      includeBeatSaver?: boolean;
      type?: DetailType;
    }
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    options = {
      includeBeatSaver: true,
      type: DetailType.BASIC,
      ...options,
    };

    // Simplified cache key
    const cacheKey = `${hash}-${difficulty}-${characteristic}-${options.type}`;

    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), cacheKey, async () => {
      const cachedLeaderboard = await ScoreSaberLeaderboardModel.findOne({
        songHash: hash,
        "difficulty.difficulty": difficulty,
        "difficulty.characteristic": characteristic,
      }).lean();

      const { cached, foundLeaderboard } = this.validateCachedLeaderboard(
        cachedLeaderboard,
        options
      );

      let leaderboard = foundLeaderboard;
      if (!leaderboard) {
        const leaderboardToken = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboardByHash(hash, difficulty, characteristic);
        if (leaderboardToken == undefined) {
          throw new NotFoundError(
            `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
          );
        }

        leaderboard = await LeaderboardService.saveLeaderboard(
          leaderboardToken.id + "",
          getScoreSaberLeaderboardFromToken(leaderboardToken)
        );
      }

      // Start BeatSaver fetch early in parallel if needed
      const beatSaverPromise = options.includeBeatSaver
        ? BeatSaverService.getMap(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic,
            options.type ?? DetailType.BASIC
          )
        : Promise.resolve(undefined);

      // Process leaderboard while BeatSaver data is being fetched
      const processedLeaderboard = this.leaderboardToObject(leaderboard);
      if (!processedLeaderboard.fullName) {
        processedLeaderboard.fullName =
          `${processedLeaderboard.songName} ${processedLeaderboard.songSubName}`.trim();
      }

      // Wait for BeatSaver data
      const beatSaverMap = await beatSaverPromise;

      return {
        leaderboard: processedLeaderboard as ScoreSaberLeaderboard,
        beatsaver: beatSaverMap,
        cached: cached,
      };
    });
  }

  /**
   * Saves a leaderboard to the database.
   *
   * @param id the leaderboard id
   * @param leaderboard the leaderboard from ScoreSaber
   * @returns the saved leaderboard document
   */
  private static async saveLeaderboard(
    id: string,
    leaderboard: ScoreSaberLeaderboard
  ): Promise<ScoreSaberLeaderboard> {
    const savedLeaderboard = await ScoreSaberLeaderboardModel.findOneAndUpdate(
      { _id: id },
      {
        ...leaderboard,
        lastRefreshed: new Date(),
        songArtColor: "#fff",
        // songArtColor: (await ImageService.getAverageImageColor(leaderboardToken.coverImage))?.color,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    if (!savedLeaderboard) {
      throw new Error(`Failed to save leaderboard for "${id}"`);
    }

    return savedLeaderboard;
  }

  /**
   * Fetches all ranked leaderboards from the ScoreSaber API
   */
  private static async fetchAllRankedLeaderboards(): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
  }> {
    let page = 1;
    let hasMorePages = true;
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const rankedMapDiffs: Map<string, LeaderboardDifficulty[]> = new Map();

    while (hasMorePages) {
      const response = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboards(page, {
          ranked: true,
        });
      if (!response) {
        Logger.warn(`Failed to fetch ranked leaderboards on page ${page}.`);
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      Logger.info(
        `Fetched ${response.leaderboards.length} ranked leaderboards on page ${page}/${totalPages}.`
      );

      for (const token of response.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        leaderboards.push(leaderboard);
        this.updateRankedMapDifficulties(rankedMapDiffs, leaderboard);
      }

      hasMorePages = page < totalPages;
      page++;
    }

    return { leaderboards, rankedMapDiffs };
  }

  /**
   * Updates the difficulties map for a given leaderboard
   */
  private static updateRankedMapDifficulties(
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>,
    leaderboard: ScoreSaberLeaderboard
  ): void {
    const difficulties = rankedMapDiffs.get(leaderboard.songHash) ?? [];
    difficulties.push({
      leaderboardId: leaderboard.id,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
      difficultyRaw: leaderboard.difficulty.difficultyRaw,
    });
    rankedMapDiffs.set(leaderboard.songHash, difficulties);
  }

  /**
   * Processes updates for all leaderboards
   */
  private static async processLeaderboardUpdates(
    leaderboards: ScoreSaberLeaderboard[],
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>
  ): Promise<LeaderboardUpdates> {
    const leaderboardUpdates: LeaderboardUpdates = {
      updatedScoresCount: 0,
      updatedLeaderboardsCount: 0,
      updatedLeaderboards: [],
    };

    Logger.info(`Processing ${leaderboards.length} leaderboards...`);

    let checkedCount = 0;
    for (const leaderboard of leaderboards) {
      checkedCount++;
      let previousLeaderboard: ScoreSaberLeaderboard | null =
        await ScoreSaberLeaderboardModel.findById(leaderboard.id).lean();
      if (!previousLeaderboard) {
        previousLeaderboard = await this.saveLeaderboard(leaderboard.id + "", leaderboard);
      }

      if (!previousLeaderboard) {
        Logger.warn(`Failed to find leaderboard for ${leaderboard.id}`);
        continue;
      }

      const update = this.checkLeaderboardChanges(leaderboard, previousLeaderboard);
      if (update.rankedStatusChanged || update.starCountChanged || update.qualifiedStatusChanged) {
        leaderboardUpdates.updatedScoresCount += await this.handleLeaderboardUpdate(update);
        leaderboardUpdates.updatedLeaderboardsCount++;
        leaderboardUpdates.updatedLeaderboards.push({ leaderboard, update });
      }

      // Save the leaderboard
      await this.saveLeaderboard(
        leaderboard.id + "",
        this.updateLeaderboardDifficulties(leaderboard, rankedMapDiffs)
      );

      if (checkedCount % 100 === 0) {
        Logger.info(`Checked ${checkedCount}/${leaderboards.length} leaderboards`);
      }
    }

    Logger.info(
      `Finished processing ${leaderboardUpdates.updatedScoresCount} leaderboard score updates and ${leaderboardUpdates.updatedLeaderboardsCount} leaderboard updates.`
    );
    return leaderboardUpdates;
  }

  /**
   * Checks if a leaderboard's ranked status, qualified status, or star count has changed
   */
  private static checkLeaderboardChanges(
    leaderboard: ScoreSaberLeaderboard,
    previousLeaderboard: ScoreSaberLeaderboard
  ): LeaderboardUpdate {
    return {
      leaderboard,
      previousLeaderboard,
      rankedStatusChanged: leaderboard.ranked !== previousLeaderboard?.ranked,
      qualifiedStatusChanged: leaderboard.qualified !== previousLeaderboard?.qualified,
      starCountChanged: leaderboard.stars !== previousLeaderboard?.stars,
    };
  }

  /**
   * Handles updates for a single leaderboard when its status changes
   */
  private static async handleLeaderboardUpdate(update: LeaderboardUpdate): Promise<number> {
    const scores: ScoreSaberScoreDocument[] = (await ScoreSaberScoreModel.find({
      leaderboardId: update.leaderboard.id,
    }).sort({ timestamp: -1 })) as unknown as ScoreSaberScoreDocument[];

    if (!scores) {
      console.warn(`Failed to fetch local scores for leaderboard "${update.leaderboard.id}".`);
      return 0;
    }

    await this.logLeaderboardChanges(update);

    if (update.rankedStatusChanged && !update.leaderboard.ranked) {
      await this.resetScorePP(scores);
      return 0;
    }

    if (
      (update.starCountChanged && update.leaderboard.ranked) ||
      (update.rankedStatusChanged && update.leaderboard.ranked) ||
      (update.qualifiedStatusChanged && update.leaderboard.qualified)
    ) {
      return await this.updateScoresFromAPI(update.leaderboard, scores);
    }

    return 0;
  }

  /**
   * Logs changes in leaderboard status
   */
  private static async logLeaderboardChanges(update: LeaderboardUpdate): Promise<void> {
    if (update.rankedStatusChanged) {
      Logger.info(
        `Leaderboard "${update.leaderboard.id}" ranked status changed from ${update.previousLeaderboard?.ranked} to ${update.leaderboard.ranked}.`
      );
    }
    if (update.starCountChanged) {
      Logger.info(
        `Leaderboard "${update.leaderboard.id}" star count changed from ${update.previousLeaderboard?.stars} to ${update.leaderboard.stars}.`
      );
    }
  }

  /**
   * Resets PP values for all scores in an unranked leaderboard
   */
  private static async resetScorePP(scores: ScoreSaberScoreDocument[]): Promise<void> {
    for (const score of scores) {
      score.pp = 0;
      score.weight = 0;
    }
    await Promise.all(scores.map(score => score.save()));
  }

  /**
   * Updates scores by fetching current data from the ScoreSaber API
   */
  private static async updateScoresFromAPI(
    leaderboard: ScoreSaberLeaderboard,
    existingScores: ScoreSaberScoreDocument[]
  ): Promise<number> {
    const scoreTokens = await this.fetchAllLeaderboardScores(leaderboard.id + "");
    let updatedCount = 0;

    for (const scoreToken of scoreTokens) {
      const score = existingScores.find(
        score => score.scoreId === scoreToken.id + "" && score.score == scoreToken.baseScore
      );
      if (!score) {
        continue;
      }

      updatedCount += await this.updateScore(score, scoreToken, leaderboard);
    }

    await Promise.all(existingScores.map(score => score.save()));
    return updatedCount;
  }

  /**
   * Fetches all scores for a specific leaderboard
   */
  private static async fetchAllLeaderboardScores(
    leaderboardId: string
  ): Promise<ScoreSaberScoreToken[]> {
    const scoreTokens: ScoreSaberScoreToken[] = [];
    let currentPage = 1;
    let hasMoreScores = true;

    while (hasMoreScores) {
      const response = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboardId + "", currentPage);
      if (!response) {
        Logger.warn(
          `Failed to fetch scoresaber api scores for leaderboard "${leaderboardId}" on page ${currentPage}`
        );
        currentPage++;
        continue;
      }
      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      Logger.info(
        `Fetched scores for leaderboard "${leaderboardId}" on page ${currentPage}/${totalPages}`
      );

      scoreTokens.push(...response.scores);
      hasMoreScores = currentPage < totalPages;
      currentPage++;
    }

    return scoreTokens;
  }

  /**
   * Updates a single score with new data
   */
  private static async updateScore(
    score: ScoreSaberScoreDocument,
    scoreToken: ScoreSaberScoreToken,
    leaderboard: ScoreSaberLeaderboard
  ): Promise<number> {
    score.pp = scoreToken.pp;
    score.weight = scoreToken.weight;
    score.rank = scoreToken.rank;

    Logger.info(
      `Updated score ${score.id} for leaderboard ${leaderboard.fullName}, new pp: ${score.pp}`
    );
    await this.updatePreviousScores(score, leaderboard);
    return 1;
  }

  /**
   * Updates previous scores for a player on a leaderboard
   */
  private static async updatePreviousScores(
    score: ScoreSaberScoreDocument,
    leaderboard: ScoreSaberLeaderboard
  ): Promise<void> {
    const previousScores = await ScoreSaberPreviousScoreModel.find({
      playerId: score.playerId,
      leaderboardId: score.leaderboardId,
    });

    if (previousScores.length === 0) return;

    for (const previousScore of previousScores) {
      previousScore.pp = leaderboard.ranked
        ? ApiServiceRegistry.getInstance()
            .getScoreSaberService()
            .getPp(leaderboard.stars, previousScore.accuracy)
        : 0;
      previousScore.weight = 0;
      await previousScore.save();
    }

    Logger.info(
      `Updated previous scores pp values on leaderboard ${leaderboard.fullName} for player ${score.playerId}`
    );
  }

  /**
   * Updates the difficulties for a leaderboard
   */
  private static updateLeaderboardDifficulties(
    leaderboard: ScoreSaberLeaderboard,
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>
  ): ScoreSaberLeaderboard {
    const difficulties = rankedMapDiffs
      .get(leaderboard.songHash)
      ?.sort((a, b) => getDifficulty(a.difficulty).id - getDifficulty(b.difficulty).id);

    return {
      ...leaderboard,
      difficulties: difficulties ?? [],
    } as ScoreSaberLeaderboard;
  }

  /**
   * Unranks leaderboards that are no longer in the ranked list
   */
  private static async unrankOldLeaderboards(
    currentLeaderboards: ScoreSaberLeaderboard[]
  ): Promise<ScoreSaberLeaderboard[]> {
    const unrankedLeaderboards: ScoreSaberLeaderboard[] = [];

    const rankedIds = currentLeaderboards.map(leaderboard => leaderboard.id);
    const rankedLeaderboards = await ScoreSaberLeaderboardModel.find({
      ranked: true,
      _id: { $nin: rankedIds },
    });
    let totalUnranked = 0;

    for (const previousLeaderboard of rankedLeaderboards) {
      const leaderboard = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboard(previousLeaderboard.id + "");
      if (!leaderboard || leaderboard.ranked) continue;

      totalUnranked++;
      await this.unrankLeaderboard(previousLeaderboard);
      unrankedLeaderboards.push(previousLeaderboard);
    }

    Logger.info(`Unranked ${totalUnranked} previously ranked leaderboards.`);
    return unrankedLeaderboards;
  }

  /**
   * Unranks a single leaderboard and updates its scores
   */
  private static async unrankLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    const scores = await ScoreSaberScoreModel.find({ leaderboardId: leaderboard.id });
    if (!scores) {
      Logger.warn(`Failed to fetch local scores in unrank for leaderboard "${leaderboard.id}".`);
      return;
    }

    for (const score of scores) {
      score.pp = 0;
      score.weight = 0;
    }

    await Promise.all(scores.map(score => score.save()));
    await ScoreSaberLeaderboardModel.findOneAndUpdate(
      { _id: leaderboard.id },
      {
        lastRefreshed: new Date(),
        ...leaderboard,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    Logger.info(`Previously ranked leaderboard "${leaderboard.id}" has been unranked.`);
  }

  /**
   * Refreshes the ranked leaderboards
   */
  public static async refreshRankedLeaderboards(): Promise<RefreshResult> {
    Logger.info("Refreshing ranked leaderboards...");
    const before = Date.now();
    const { leaderboards, rankedMapDiffs } = await this.fetchAllRankedLeaderboards();
    const updatedScores = await this.processLeaderboardUpdates(leaderboards, rankedMapDiffs);
    const unrankedLeaderboards = await this.unrankOldLeaderboards(leaderboards);

    // Update the ranked maps playlist
    const rankedPlaylist = await PlaylistService.createRankedPlaylist(leaderboards);
    await PlaylistService.updatePlaylist("scoresaber-ranked-maps", {
      title: rankedPlaylist.title,
      image: rankedPlaylist.image,
      songs: rankedPlaylist.songs,
    });

    await logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder()
        .setTitle(`Refreshed ${leaderboards.length} ranked leaderboards.`)
        .setDescription(
          `Updated ${updatedScores.updatedScoresCount} scores in ${formatDuration(Date.now() - before)}`
        )
        .setColor("#00ff00")
    );

    if (updatedScores.updatedLeaderboardsCount > 0) {
      await this.logLeaderboardUpdates(updatedScores, unrankedLeaderboards);
    }

    return {
      refreshedLeaderboards: leaderboards.length,
      updatedScoresCount: updatedScores.updatedScoresCount,
      updatedLeaderboardsCount: updatedScores.updatedLeaderboardsCount,
    };
  }

  /**
   * Refreshes the qualified leaderboards
   */
  public static async refreshQualifiedLeaderboards(): Promise<RefreshResult> {
    Logger.info("Refreshing qualified leaderboards...");
    const before = Date.now();
    const { leaderboards, rankedMapDiffs } = await this.fetchAllQualifiedLeaderboards();
    const updatedScores = await this.processLeaderboardUpdates(leaderboards, rankedMapDiffs);

    // Update the qualified maps playlist
    const qualifiedPlaylist = await PlaylistService.createQualifiedPlaylist();
    await PlaylistService.updatePlaylist("scoresaber-qualified-maps", {
      title: qualifiedPlaylist.title,
      image: qualifiedPlaylist.image,
      songs: qualifiedPlaylist.songs,
    });

    await logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder()
        .setTitle(`Refreshed ${leaderboards.length} qualified leaderboards.`)
        .setDescription(
          `Updated ${updatedScores.updatedScoresCount} scores in ${formatDuration(
            Date.now() - before
          )}`
        )
        .setColor("#00ff00")
    );

    return {
      refreshedLeaderboards: leaderboards.length,
      updatedScoresCount: updatedScores.updatedScoresCount,
      updatedLeaderboardsCount: updatedScores.updatedLeaderboardsCount,
    };
  }

  /**
   * Logs the leaderboard updates to Discord.
   */
  private static async logLeaderboardUpdates(
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
      DiscordChannels.rankedLogs,
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
      await generatePlaylistImage("SSR", {
        title: `Ranked Batch (${formatDateMinimal(new Date())})`,
      }),
      "ranked-batch"
    );
    await PlaylistService.createPlaylist(playlist);
    await sendFile(
      DiscordChannels.rankedLogs,
      `ranked-batch-${date}.bplist`,
      JSON.stringify(playlist, null, 2),
      "<@&1338261690952978442>"
    );
    Logger.info("Logged leaderboard changes to Discord.");
  }

  /**
   * Fetches all qualified leaderboards from the ScoreSaber API
   */
  private static async fetchAllQualifiedLeaderboards(): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
  }> {
    let page = 1;
    let hasMorePages = true;
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const rankedMapDiffs: Map<string, LeaderboardDifficulty[]> = new Map();

    while (hasMorePages) {
      const response = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboards(page, {
          qualified: true,
        });
      if (!response) {
        Logger.warn(`Failed to fetch qualified leaderboards on page ${page}.`);
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      Logger.info(
        `Fetched ${response.leaderboards.length} qualified leaderboards on page ${page}/${totalPages}.`
      );

      for (const token of response.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        leaderboards.push(leaderboard);
        this.updateRankedMapDifficulties(rankedMapDiffs, leaderboard);
      }

      hasMorePages = page < totalPages;
      page++;
    }

    return { leaderboards, rankedMapDiffs };
  }

  /**
   * Gets the ranked leaderboards based on the options
   *
   * @param options the options for the query
   * @returns the ranked leaderboards
   */
  public static async getRankedLeaderboards(options?: {
    projection?: { [field: string]: number };
    sort?: "dateRanked" | "stars";
    /* eslint-disable @typescript-eslint/no-explicit-any */
    match?: { [field: string]: any };
  }): Promise<ScoreSaberLeaderboard[]> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.Leaderboards),
      `ranked-leaderboards-${JSON.stringify(options)}`,
      async () => {
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

        return leaderboards.map(leaderboard => this.leaderboardToObject(leaderboard));
      }
    );
  }

  /**
   * Gets all the qualified leaderboards
   *
   * @returns the qualified leaderboards
   */
  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.Leaderboards),
      "qualified-leaderboards",
      async () => {
        const leaderboards = await ScoreSaberLeaderboardModel.find({ qualified: true }).lean();
        return leaderboards.map(leaderboard => this.leaderboardToObject(leaderboard));
      }
    );
  }

  /**
   * Converts a database leaderboard to a ScoreSaberLeaderboard.
   *
   * @param leaderboard the leaderboard to convert
   * @returns the converted leaderboard
   * @private
   */
  private static leaderboardToObject(leaderboard: ScoreSaberLeaderboard): ScoreSaberLeaderboard {
    return {
      ...removeObjectFields<ScoreSaberLeaderboard>(leaderboard, ["_id", "__v"]),
      id: leaderboard._id,
    } as ScoreSaberLeaderboard;
  }
}
