import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { NotFoundError } from "elysia";
import BeatSaverService from "./beatsaver.service";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardDocument,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { fetchWithCache } from "../common/cache.util";
import { delay } from "@ssr/common/utils/utils";
import { ScoreSaberScoreDocument, ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import CacheService, { ServiceCache } from "./cache.service";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";
import { formatDuration } from "@ssr/common/utils/time-utils";

export const SCORESABER_REQUEST_COOLDOWN = 60_000 / 300; // 300 requests per minute
const CACHE_REFRESH_TIME = 1000 * 60 * 60 * 12; // 12 hours

type RefreshResult = {
  refreshedLeaderboards: number;
  updatedScores: number;
};

type LeaderboardUpdate = {
  leaderboard: ScoreSaberLeaderboard;
  previousLeaderboard: ScoreSaberLeaderboard;
  rankedStatusChanged: boolean;
  starCountChanged: boolean;
  qualifiedStatusChanged: boolean;
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
    cachedLeaderboard: ScoreSaberLeaderboardDocument | null,
    options?: { cacheOnly?: boolean }
  ): { cached: boolean; foundLeaderboard?: ScoreSaberLeaderboardDocument } {
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
    }
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    if (!options) {
      options = {
        includeBeatSaver: true,
      };
    }

    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), id, async () => {
      const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id);
      const { cached, foundLeaderboard } = this.validateCachedLeaderboard(cachedLeaderboard, options);

      let leaderboard = foundLeaderboard;
      if (!leaderboard) {
        const leaderboardToken = await scoresaberService.lookupLeaderboard(id);
        if (leaderboardToken == undefined) {
          throw new NotFoundError(`Leaderboard not found for "${id}"`);
        }

        leaderboard = await LeaderboardService.saveLeaderboard(id, getScoreSaberLeaderboardFromToken(leaderboardToken));
      }

      return LeaderboardService.processLeaderboard(leaderboard, options, cached);
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
    }
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    if (!options) {
      options = {
        includeBeatSaver: true,
      };
    }

    const cacheKey = `${hash}-${difficulty}-${characteristic}`;

    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), cacheKey, async () => {
      const cachedLeaderboard = await ScoreSaberLeaderboardModel.findOne({
        songHash: hash,
        "difficulty.difficulty": difficulty,
        "difficulty.characteristic": characteristic,
      });

      const { cached, foundLeaderboard } = this.validateCachedLeaderboard(cachedLeaderboard, options);

      let leaderboard = foundLeaderboard;
      if (!leaderboard) {
        const leaderboardToken = await scoresaberService.lookupLeaderboardByHash(hash, difficulty, characteristic);
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

      return LeaderboardService.processLeaderboard(leaderboard, options, cached);
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
  ): Promise<ScoreSaberLeaderboardDocument> {
    const savedLeaderboard = await ScoreSaberLeaderboardModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          ...leaderboard,
          lastRefreshed: new Date(),
          songArtColor: "#fff",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!savedLeaderboard) {
      throw new Error(`Failed to save leaderboard for "${id}"`);
    }

    return savedLeaderboard;
  }

  /**
   * Processes a leaderboard document and returns the response.
   *
   * @param foundLeaderboard the found leaderboard document
   * @param options the processing options
   * @param cached whether the leaderboard was cached
   * @returns the processed leaderboard response
   */
  private static async processLeaderboard(
    foundLeaderboard: ScoreSaberLeaderboardDocument,
    options: {
      cacheOnly?: boolean;
      includeBeatSaver?: boolean;
    },
    cached: boolean
  ): Promise<LeaderboardResponse<ScoreSaberLeaderboard>> {
    if (foundLeaderboard == undefined) {
      throw new NotFoundError(`Leaderboard not found`);
    }

    const beatSaverMap = options.includeBeatSaver
      ? await BeatSaverService.getMap(
          foundLeaderboard.songHash,
          foundLeaderboard.difficulty.difficulty,
          foundLeaderboard.difficulty.characteristic
        )
      : undefined;

    const leaderboard = (
      await LeaderboardService.fixMaxScore(foundLeaderboard, beatSaverMap)
    ).toObject() as ScoreSaberLeaderboard;

    if (leaderboard.fullName == undefined) {
      leaderboard.fullName = `${leaderboard.songName} ${leaderboard.songSubName}`.trim();
    }

    return {
      leaderboard: leaderboard as ScoreSaberLeaderboard,
      beatsaver: beatSaverMap,
      cached: cached,
    } as LeaderboardResponse<ScoreSaberLeaderboard>;
  }

  /**
   * Fixes the max score if it's broken.
   *
   * @param leaderboard the leaderboard
   * @param beatSaverMap the beatSaverMap
   */
  private static async fixMaxScore(
    leaderboard: ScoreSaberLeaderboardDocument,
    beatSaverMap: BeatSaverMapResponse | undefined
  ) {
    // Fix max score if it's broken (ScoreSaber is annoying)
    if (leaderboard.maxScore == 0 && beatSaverMap != undefined && beatSaverMap.difficulty?.maxScore != undefined) {
      leaderboard.maxScore = beatSaverMap.difficulty.maxScore;
      await leaderboard.save();
    }

    return leaderboard;
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
      const response = await scoresaberService.lookupLeaderboards(page, { ranked: true });
      if (!response) {
        console.warn(`Failed to fetch ranked leaderboards on page ${page}.`);
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      console.log(`Fetched ${response.leaderboards.length} ranked leaderboards on page ${page}/${totalPages}.`);

      for (const token of response.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        leaderboards.push(leaderboard);
        this.updateRankedMapDifficulties(rankedMapDiffs, leaderboard);
      }

      hasMorePages = page < totalPages;
      page++;
      await delay(SCORESABER_REQUEST_COOLDOWN);
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
  ): Promise<number> {
    let updatedScores = 0;
    console.log(`Processing ${leaderboards.length} leaderboards...`);

    let checkedCount = 0;
    for (const leaderboard of leaderboards) {
      checkedCount++;
      let previousLeaderboard: ScoreSaberLeaderboardDocument | null = await ScoreSaberLeaderboardModel.findById(
        leaderboard.id
      );
      if (!previousLeaderboard) {
        previousLeaderboard = await this.saveLeaderboard(leaderboard.id + "", leaderboard);
      }

      if (!previousLeaderboard) {
        console.warn(`Failed to find leaderboard for ${leaderboard.id}`);
        continue;
      }

      const update = this.checkLeaderboardChanges(leaderboard, previousLeaderboard);
      if (update.rankedStatusChanged || update.starCountChanged || update.qualifiedStatusChanged) {
        updatedScores += await this.handleLeaderboardUpdate(update);
      }

      await this.updateLeaderboardDifficulties(leaderboard, rankedMapDiffs);

      if (checkedCount % 100 === 0) {
        console.log(`Checked ${checkedCount}/${leaderboards.length} leaderboards`);
      }
    }

    console.log(`Finished processing ${updatedScores} leaderboard score updates.`);
    return updatedScores;
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
      console.log(
        `Leaderboard "${update.leaderboard.id}" ranked status changed from ${update.previousLeaderboard?.ranked} to ${update.leaderboard.ranked}.`
      );
    }
    if (update.starCountChanged) {
      console.log(
        `Leaderboard "${update.leaderboard.id}" star count changed from ${update.previousLeaderboard?.stars} to ${update.leaderboard.stars}.`
      );
    }

    //await this.notifyLeaderboardChange(update);
  }

  /**
   * Logs the leaderboard change to Discord.
   *
   * @param update The leaderboard update.
   * @private
   */
  private static async notifyLeaderboardChange(update: LeaderboardUpdate): Promise<void> {
    const { leaderboard, previousLeaderboard } = update;

    // Determine the type of change
    let changeType = "";
    if (!previousLeaderboard.ranked && leaderboard.ranked) {
      changeType = "now ranked";
    } else if (previousLeaderboard.ranked && !leaderboard.ranked) {
      changeType = "no longer ranked";
    } else if (!previousLeaderboard.qualified && leaderboard.qualified) {
      changeType = "now qualified";
    } else if (previousLeaderboard.qualified && !leaderboard.qualified) {
      changeType = "no longer qualified";
    }

    // Generate a single status change message
    const statusChangeMessage = `${leaderboard.fullName} is ${changeType}!`;

    // Check if the leaderboard was reweighted (star count changed while ranked)
    const wasReweighed = previousLeaderboard.stars !== leaderboard.stars && previousLeaderboard.ranked;

    // Get difficulty name
    const difficulty = getDifficulty(leaderboard.difficulty.difficulty);

    // Determine the Discord channel to log to
    const channel =
      leaderboard.status === "Ranked" || leaderboard.status === "Unranked"
        ? DiscordChannels.rankedLogs
        : DiscordChannels.qualifiedLogs;

    // Build the Discord embed
    const embed = new EmbedBuilder()
      .setTitle(statusChangeMessage)
      .setDescription(
        `
Difficulty: **${difficulty.alternativeName ?? difficulty.name}**
${leaderboard.ranked ? `Stars:${wasReweighed ? ` **${previousLeaderboard.stars}** ->` : ""} **${leaderboard.stars}**` : ""}
Mapped by: **${leaderboard.levelAuthorName}**
Map: https://ssr.fascinated.cc/leaderboard/${leaderboard.id}
`
      )
      .setThumbnail(leaderboard.songArt)
      .setColor(changeType.includes("no longer") ? "#ff0000" : "#00ff00"); // Red for negative changes, green for positive changes

    // Log the message to Discord
    await logToChannel(channel, embed);
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
      if (!score) continue;

      updatedCount += await this.updateScore(score, scoreToken, leaderboard);
    }

    await Promise.all(existingScores.map(score => score.save()));
    return updatedCount;
  }

  /**
   * Fetches all scores for a specific leaderboard
   */
  private static async fetchAllLeaderboardScores(leaderboardId: string): Promise<ScoreSaberScoreToken[]> {
    const scoreTokens: ScoreSaberScoreToken[] = [];
    let currentPage = 1;
    let hasMoreScores = true;

    while (hasMoreScores) {
      const response = await scoresaberService.lookupLeaderboardScores(leaderboardId + "", currentPage);
      if (!response) {
        console.warn(`Failed to fetch scoresaber api scores for leaderboard "${leaderboardId}" on page ${currentPage}`);
        currentPage++;
        await delay(SCORESABER_REQUEST_COOLDOWN);
        continue;
      }
      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      console.log(`Fetched scores for leaderboard "${leaderboardId}" on page ${currentPage}/${totalPages}`);

      scoreTokens.push(...response.scores);
      hasMoreScores = currentPage < totalPages;
      currentPage++;
      await delay(SCORESABER_REQUEST_COOLDOWN);
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

    console.log(`Updated score ${score.id} for leaderboard ${leaderboard.fullName}, new pp: ${score.pp}`);
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
      previousScore.pp = leaderboard.ranked ? scoresaberService.getPp(leaderboard.stars, previousScore.accuracy) : 0;
      previousScore.weight = 0;
      await previousScore.save();
    }

    console.log(
      `Updated previous scores pp values on leaderboard ${leaderboard.fullName} for player ${score.playerId}`
    );
  }

  /**
   * Updates the difficulties for a leaderboard
   */
  private static async updateLeaderboardDifficulties(
    leaderboard: ScoreSaberLeaderboard,
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>
  ): Promise<void> {
    const difficulties = rankedMapDiffs
      .get(leaderboard.songHash)
      ?.sort((a, b) => getDifficulty(a.difficulty).id - getDifficulty(b.difficulty).id);

    if (leaderboard.difficulties.length !== difficulties?.length) {
      await ScoreSaberLeaderboardModel.findOneAndUpdate(
        { _id: leaderboard.id },
        {
          lastRefreshed: new Date(),
          ...leaderboard,
          difficulties: difficulties ?? [],
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }
  }

  /**
   * Unranks leaderboards that are no longer in the ranked list
   */
  private static async unrankOldLeaderboards(currentLeaderboards: ScoreSaberLeaderboard[]): Promise<void> {
    const rankedIds = currentLeaderboards.map(leaderboard => leaderboard.id);
    const rankedLeaderboards = await ScoreSaberLeaderboardModel.find({ ranked: true, _id: { $nin: rankedIds } });
    let totalUnranked = 0;

    for (const previousLeaderboard of rankedLeaderboards) {
      const leaderboard = await scoresaberService.lookupLeaderboard(previousLeaderboard.id + "");
      if (!leaderboard || leaderboard.ranked) continue;

      totalUnranked++;
      await this.unrankLeaderboard(previousLeaderboard);
      await delay(SCORESABER_REQUEST_COOLDOWN);
    }

    console.log(`Unranked ${totalUnranked} previously ranked leaderboards.`);
  }

  /**
   * Unranks a single leaderboard and updates its scores
   */
  private static async unrankLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    const scores = await ScoreSaberScoreModel.find({ leaderboardId: leaderboard.id });
    if (!scores) {
      console.warn(`Failed to fetch local scores in unrank for leaderboard "${leaderboard.id}".`);
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
    console.log(`Previously ranked leaderboard "${leaderboard.id}" has been unranked.`);
  }

  /**
   * Refreshes the ranked status and stars of all ranked leaderboards.
   */
  public static async refreshRankedLeaderboards(): Promise<RefreshResult> {
    console.log("Refreshing ranked leaderboards...");
    const before = Date.now();
    const { leaderboards, rankedMapDiffs } = await this.fetchAllRankedLeaderboards();
    const updatedScores = await this.processLeaderboardUpdates(leaderboards, rankedMapDiffs);
    await this.unrankOldLeaderboards(leaderboards);

    await logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder()
        .setTitle(`Refreshed ${leaderboards.length} ranked leaderboards.`)
        .setDescription(`Updated ${updatedScores} scores in ${formatDuration(Date.now() - before)}`)
        .setColor("#00ff00")
    );

    return {
      refreshedLeaderboards: leaderboards.length,
      updatedScores,
    };
  }

  /**
   * Refreshes the qualified leaderboards
   */
  public static async refreshQualifiedLeaderboards(): Promise<RefreshResult> {
    console.log("Refreshing qualified leaderboards...");
    const before = Date.now();
    const { leaderboards, rankedMapDiffs } = await this.fetchAllQualifiedLeaderboards();
    const updatedScores = await this.processLeaderboardUpdates(leaderboards, rankedMapDiffs);

    await logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder()
        .setTitle(`Refreshed ${leaderboards.length} qualified leaderboards.`)
        .setDescription(`Updated ${updatedScores} scores in ${formatDuration(Date.now() - before)}`)
        .setColor("#00ff00")
    );

    return {
      refreshedLeaderboards: leaderboards.length,
      updatedScores,
    };
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
      const response = await scoresaberService.lookupLeaderboards(page, { qualified: true });
      if (!response) {
        console.warn(`Failed to fetch qualified leaderboards on page ${page}.`);
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      console.log(`Fetched ${response.leaderboards.length} qualified leaderboards on page ${page}/${totalPages}.`);

      for (const token of response.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        leaderboards.push(leaderboard);
        this.updateRankedMapDifficulties(rankedMapDiffs, leaderboard);
      }

      hasMorePages = page < totalPages;
      page++;
      await delay(SCORESABER_REQUEST_COOLDOWN);
    }

    return { leaderboards, rankedMapDiffs };
  }

  /**
   * Gets all the ranked leaderboards
   *
   * @returns the ranked leaderboards
   */
  public static async getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), "ranked-leaderboards", async () => {
      const leaderboards = await ScoreSaberLeaderboardModel.find({ ranked: true }).sort({ dateRanked: -1 }); // Sort by date ranked (newest -> oldest)
      return leaderboards.map(leaderboard => leaderboard.toObject());
    });
  }

  /**
   * Gets all the qualified leaderboards
   *
   * @returns the qualified leaderboards
   */
  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return fetchWithCache(CacheService.getCache(ServiceCache.Leaderboards), "qualified-leaderboards", async () => {
      const leaderboards = await ScoreSaberLeaderboardModel.find({ qualified: true });
      return leaderboards.map(leaderboard => leaderboard.toObject());
    });
  }
}
