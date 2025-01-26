import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { NotFoundError } from "elysia";
import ScoreSaberPlayer, { ScoreSaberBadge, ScoreSaberBio } from "@ssr/common/player/impl/scoresaber-player";
import sanitize from "sanitize-html";
import { PlayerHistory } from "@ssr/common/player/player-history";
import { PlayerDocument } from "@ssr/common/model/player";
import { PlayerService } from "./player.service";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { formatChange, getPageFromRank, isProduction } from "@ssr/common/utils/utils";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import {
  ScoreSaberPreviousScoreOverview,
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardService from "./leaderboard.service";
import BeatLeaderService from "./beatleader.service";
import { PlayerScore } from "@ssr/common/score/player-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { Config } from "@ssr/common/config";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";
import BeatSaverService from "./beatsaver.service";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { Timeframe } from "@ssr/common/timeframe";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";

export default class ScoreSaberService {
  /**
   * Notifies the number one score in Discord.
   *
   * @param playerScore the score to notify
   */
  public static async notifyNumberOne(playerScore: ScoreSaberPlayerScoreToken) {
    // Only notify in production
    if (!isProduction()) {
      return;
    }

    const { score: scoreToken, leaderboard: leaderboardToken } = playerScore;
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const score = getScoreSaberScoreFromToken(scoreToken, leaderboard, scoreToken.leaderboardPlayerInfo.id);
    const playerInfo = score.playerInfo;

    // Not ranked
    if (leaderboard.stars <= 0) {
      return;
    }
    // Not #1 rank
    if (score.rank !== 1) {
      return;
    }

    const beatSaver = await BeatSaverService.getMap(
      leaderboard.songHash,
      leaderboard.difficulty.difficulty,
      leaderboard.difficulty.characteristic
    );
    const player = await scoresaberService.lookupPlayer(playerInfo.id);
    if (!player) {
      return;
    }

    const previousScore = await ScoreSaberService.getPreviousScore(player.id, score, leaderboard, score.timestamp);
    const change = previousScore &&
      previousScore.change && {
        accuracy: `${formatChange(previousScore.change.accuracy, value => value.toFixed(2) + "%") || ""}`,
        pp: `${formatChange(previousScore.change.pp, undefined, true) || ""}`,
        misses: previousScore.misses == score.misses ? "" : ` vs ${previousScore.misses}` || "",
        badCuts: previousScore.badCuts == score.badCuts ? "" : ` vs ${previousScore.badCuts}` || "",
        maxCombo: previousScore.maxCombo == score.maxCombo ? "" : ` vs ${previousScore.maxCombo}` || "",
      };

    const message = await logToChannel(
      DiscordChannels.numberOneFeed,
      new EmbedBuilder()
        .setTitle(`${player.name} just set a #1!`)
        .setDescription(
          [
            `${leaderboard.fullName} (${getDifficultyName(leaderboard.difficulty.difficulty)} ${leaderboard.stars.toFixed(2)}★)`,
            [
              `[[Player]](${Config.websiteUrl}/player/${player.id})`,
              `[[Leaderboard]](${Config.websiteUrl}/leaderboard/${leaderboard.id})`,
              beatSaver ? `[[Map]](https://beatsaver.com/maps/${beatSaver.bsr})` : undefined,
            ].join(" "),
          ]
            .join("\n")
            .trim()
        )
        .addFields([
          {
            name: "Accuracy",
            value: `${formatScoreAccuracy(score)} ${change ? change.accuracy : ""}`,
            inline: true,
          },
          {
            name: "PP",
            value: `${formatPp(score.pp)}pp ${change ? change.pp : ""}`,
            inline: true,
          },
          {
            name: "Player Rank",
            value: `#${formatNumberWithCommas(player.rank)}`,
            inline: true,
          },
          {
            name: "Misses",
            value: `${formatNumberWithCommas(score.missedNotes)} ${change ? change.misses : ""}`,
            inline: true,
          },
          {
            name: "Bad Cuts",
            value: `${formatNumberWithCommas(score.badCuts)} ${change ? change.badCuts : ""}`,
            inline: true,
          },
          {
            name: "Max Combo",
            value: `${formatNumberWithCommas(score.maxCombo)} ${score.fullCombo ? "/ FC" : ""} ${change ? change.maxCombo : ""}`,
            inline: true,
          },
        ])
        .setThumbnail(leaderboard.songArt)
        .setTimestamp(score.timestamp)
        .setFooter({
          text: `Powered by ${Config.websiteUrl}`,
        })
        .setColor("#00ff00")
    );

    try {
      if (message) {
        await message.crosspost();
      }
    } catch (error) {
      console.error("Failed to cross-post number one score message", error);
    }
  }

  /**
   * Gets a ScoreSaber player using their account id.
   *
   * @param id the player's account id
   * @param createIfMissing creates the player if they don't have an account with us
   * @returns the player
   */
  public static async getPlayer(id: string, createIfMissing?: boolean): Promise<ScoreSaberPlayer> {
    return fetchWithCache<ScoreSaberPlayer>(
      CacheService.getCache(ServiceCache.ScoreSaber),
      `player:${id}`,
      async () => {
        const playerToken = await scoresaberService.lookupPlayer(id);
        if (!playerToken) {
          throw new NotFoundError(`Player "${id}" not found`);
        }
        let account: PlayerDocument | undefined;
        try {
          account = await PlayerService.getPlayer(id, createIfMissing, playerToken);

          // Update peak rank
          account = await PlayerService.updatePeakRank(id, playerToken);
        } catch {
          // ignore
        }

        const bio: ScoreSaberBio = {
          lines: playerToken.bio ? sanitize(playerToken.bio).split("\n") : [],
          linesStripped: playerToken.bio ? sanitize(playerToken.bio.replace(/<[^>]+>/g, "")).split("\n") : [], // strips html tags
        };
        const badges: ScoreSaberBadge[] =
          playerToken.badges?.map(badge => {
            return {
              url: badge.image,
              description: badge.description,
            };
          }) || [];

        let statisticHistory: Record<string, PlayerHistory> = account ? account.getHistoryPreviousDays(50) : {};
        if (statisticHistory) {
          const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
          const historyElement = statisticHistory[todayDate];
          statisticHistory[todayDate] = {
            ...historyElement,
            rank: playerToken.rank,
            ...(account
              ? {
                  countryRank: playerToken.countryRank,
                  pp: playerToken.pp,
                  ...(account ? { plusOnePp: (await PlayerService.getPlayerPpBoundary(account.id, 1))[0] } : undefined),
                  replaysWatched: playerToken.scoreStats.replaysWatched,
                  accuracy: {
                    ...historyElement?.accuracy,
                    averageRankedAccuracy: playerToken.scoreStats.averageRankedAccuracy,
                  },
                  scores: {
                    rankedScores: 0,
                    unrankedScores: 0,
                    ...historyElement?.scores,
                    totalScores: playerToken.scoreStats.totalPlayCount,
                    totalRankedScores: playerToken.scoreStats.rankedPlayCount,
                  },
                  score: {
                    ...historyElement?.score,
                    totalScore: playerToken.scoreStats.totalScore,
                    totalRankedScore: playerToken.scoreStats.totalRankedScore,
                  },
                }
              : undefined),
          };
        }

        const playerRankHistory = playerToken.histories.split(",").map(value => {
          return parseInt(value);
        });
        playerRankHistory.push(playerToken.rank);

        let daysAgo = 0; // Start from current day
        for (let i = playerRankHistory.length; i >= 0; i--) {
          const rank = playerRankHistory[i];
          if (rank == 999_999) {
            continue;
          }

          const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
          daysAgo += 1;

          const dateKey = formatDateMinimal(date);
          if (!statisticHistory[dateKey] || statisticHistory[dateKey].rank == undefined) {
            statisticHistory[dateKey] = {
              ...(account ? statisticHistory[dateKey] : undefined),
              rank: rank,
            };
          }
        }

        // sort statisticHistory by date
        statisticHistory = Object.fromEntries(
          Object.entries(statisticHistory).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        );

        if (account !== undefined) {
          for (const [date, history] of Object.entries(statisticHistory)) {
            if (history.plusOnePp) {
              history.plusOnePp = Math.round(history.plusOnePp * Math.pow(10, 2)) / Math.pow(10, 2);
              statisticHistory[date] = history;
            }
          }
        }

        return {
          id: playerToken.id,
          name: playerToken.name,
          avatar: playerToken.profilePicture,
          country: playerToken.country,
          rank: playerToken.rank,
          countryRank: playerToken.countryRank,
          avatarColor: "#fff",
          hmd: await PlayerService.getPlayerHMD(playerToken.id),
          // avatarColor: (await ImageService.getAverageImageColor(playerToken.profilePicture))?.color,
          joinedDate: new Date(playerToken.firstSeen),
          bio: bio,
          pp: playerToken.pp,
          statisticChange: {
            daily: account ? await this.getStatisticChanges(statisticHistory, 1) : {},
            weekly: account ? await this.getStatisticChanges(statisticHistory, 7) : {},
            monthly: account ? await this.getStatisticChanges(statisticHistory, 30) : {},
          },
          role: playerToken.role == null ? undefined : playerToken.role,
          badges: badges,
          statisticHistory: statisticHistory,
          statistics: playerToken.scoreStats,
          rankPages: {
            global: getPageFromRank(playerToken.rank, 50),
            country: getPageFromRank(playerToken.countryRank, 50),
          },
          peakRank: account ? account.peakRank : undefined,
          permissions: playerToken.permissions,
          banned: playerToken.banned,
          inactive: playerToken.inactive,
          isBeingTracked: account !== undefined,
        } as ScoreSaberPlayer;
      }
    );
  }

  /**
   * Gets the statistic change of a player
   *
   * @param history the player's history
   * @param statType the statistic type
   * @param isNegativeChange whether the change should be negative
   * @param daysAgo the amount of days to look back
   * @returns the statistic change
   * @private
   */
  private static getStatisticChange(
    history: Record<string, PlayerHistory>,
    statType: string,
    isNegativeChange: boolean,
    daysAgo: number = 1
  ): number | undefined {
    const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
    const todayStats = history[todayDate];

    // Ensure todayStats exists and contains the statType
    const statToday = todayStats ? getValueFromHistory(todayStats, statType) : undefined;
    if (statToday === undefined) {
      return undefined;
    }

    let otherDate: Date | undefined;
    let statOther: number | undefined;

    // Optimize `daysAgo === 1` case by avoiding unnecessary computations
    if (daysAgo === 1) {
      otherDate = getMidnightAlignedDate(getDaysAgoDate(1)); // Yesterday
      const otherStats = history[formatDateMinimal(otherDate)];
      statOther = otherStats ? getValueFromHistory(otherStats, statType) : undefined;
    } else {
      const targetDate = getDaysAgoDate(daysAgo);

      // Retrieve a list of dates only once, sorted for easier access
      const sortedDates = Object.keys(history).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Use binary search to efficiently find the closest date to `targetDate`
      let closestDate: Date | undefined;
      let minDiff = Number.POSITIVE_INFINITY;

      for (const dateKey of sortedDates) {
        const date = new Date(dateKey);
        const diff = Math.abs(date.getTime() - targetDate.getTime());

        // Skip future dates
        if (date.getTime() >= new Date().getTime()) break;

        const statsForDate = history[dateKey];
        if (statType in statsForDate && diff < minDiff) {
          minDiff = diff;
          closestDate = date;
        }
      }

      // If we found a closest valid date, use it
      if (closestDate) {
        otherDate = closestDate;
        const otherStats = history[formatDateMinimal(otherDate)];
        statOther = otherStats ? getValueFromHistory(otherStats, statType) : undefined;
      }
    }

    // Return if no valid `otherStats` or `statOther` was found
    if (statOther === undefined) {
      return undefined;
    }

    // Calculate change and apply the `isNegativeChange` modifier
    return (statToday - statOther) * (isNegativeChange ? -1 : 1);
  }

  /**
   * Gets the changes in the players statistic history
   *
   * @param history the player's history
   * @param daysAgo the amount of days to look back
   * @returns the statistic changes
   * @private
   */
  private static async getStatisticChanges(
    history: Record<string, PlayerHistory>,
    daysAgo: number = 1
  ): Promise<PlayerHistory> {
    return {
      rank: this.getStatisticChange(history, "rank", true, daysAgo),
      countryRank: this.getStatisticChange(history, "countryRank", true, daysAgo),
      pp: this.getStatisticChange(history, "pp", false, daysAgo),
    };
  }

  /**
   * Gets the player scores from the database.
   *
   * @param playerId the id of the player
   * @param options the fetch options
   */
  public static async getPlayerLatestScores(
    playerId: string,
    options: {
      sort?: "pp" | "timestamp";
      limit?: number;
      ranked?: boolean;
      projection?: { [field: string]: number };
    } = {
      sort: "pp",
    }
  ): Promise<ScoreSaberScore[]> {
    const rawScores = await ScoreSaberScoreModel.aggregate([
      // Match stage based on playerId and optional ranked filter
      { $match: { playerId: playerId, ...(options?.ranked ? { pp: { $gt: 0 } } : {}) } },

      // Sort by pp in descending order
      { $sort: { [`${options.sort}`]: -1 } },

      // Optional projection stage
      ...(options?.projection
        ? [
            {
              $project: {
                ...options.projection,
                _id: 0,
                leaderboardId: 1,
                playerId: 1,
              },
            },
          ]
        : []),

      // Limit results
      ...(options?.limit ? [{ $limit: options.limit }] : []),
    ]);
    if (!rawScores) {
      return [];
    }

    const scores: ScoreSaberScore[] = [];
    for (const rawScore of rawScores) {
      scores.push(rawScore as ScoreSaberScore);
    }
    return scores;
  }

  /**
   * Checks if a ScoreSaber score already exists.
   *
   * @param playerId the id of the player
   * @param leaderboard the leaderboard
   * @param score the score to check
   */
  public static async scoreExists(playerId: string, leaderboard: ScoreSaberLeaderboard, score: ScoreSaberScore) {
    return (
      (await ScoreSaberScoreModel.exists({
        playerId: playerId + "",
        leaderboardId: leaderboard.id,
        difficulty: leaderboard.difficulty.difficulty,
        characteristic: leaderboard.difficulty.characteristic,
        score: score.score,
      })) !== null
    );
  }

  /**
   * Gets the player's score history for a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   * @param page the page to get
   */
  public static async getScoreHistory(
    playerId: string,
    leaderboardId: string,
    page: number
  ): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    const scores = await ScoreSaberPreviousScoreModel.find({ playerId: playerId, leaderboardId: leaderboardId }).sort({
      timestamp: -1,
    });
    if (scores == null || scores.length == 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    return new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(8)
      .setTotalItems(scores.length)
      .getPage(page, async () => {
        const toReturn: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = [];
        for (const scoreToken of scores) {
          let score = scoreToken.toObject() as ScoreSaberScore;

          const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
            "scoresaber",
            leaderboardId
          );
          if (leaderboardResponse == undefined) {
            throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
          }
          const { leaderboard, beatsaver } = leaderboardResponse;

          score = await ScoreSaberService.insertScoreData(score, leaderboard);
          toReturn.push({
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          });
        }

        return toReturn;
      });
  }

  /**
   * Gets the player's previous score for a map.
   *
   * @param playerId the player's id to get the previous score for
   * @param score the score to get the previous score for
   * @param leaderboard the leaderboard to get the previous score on
   * @param timestamp the score's timestamp to get the previous score for
   * @returns the score, or undefined if none
   */
  public static async getPreviousScore(
    playerId: string,
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    timestamp: Date
  ): Promise<ScoreSaberPreviousScoreOverview | undefined> {
    const scores = await ScoreSaberPreviousScoreModel.find({ playerId: playerId, leaderboardId: leaderboard.id }).sort({
      timestamp: -1,
    });
    if (scores == null || scores.length == 0) {
      return undefined;
    }

    // get first score before timestamp
    const previousScore = scores.find(score => score.timestamp.getTime() < timestamp.getTime());
    if (previousScore == undefined) {
      return undefined;
    }

    return {
      score: previousScore.score,
      accuracy: previousScore.accuracy || (score.score / leaderboard.maxScore) * 100,
      modifiers: previousScore.modifiers,
      misses: previousScore.misses,
      missedNotes: previousScore.missedNotes,
      badCuts: previousScore.badCuts,
      fullCombo: previousScore.fullCombo,
      pp: previousScore.pp,
      weight: previousScore.weight,
      maxCombo: previousScore.maxCombo,
      timestamp: previousScore.timestamp,
      change: {
        score: score.score - previousScore.score,
        accuracy:
          (score.accuracy || (score.score / leaderboard.maxScore) * 100) -
          (previousScore.accuracy || (previousScore.score / leaderboard.maxScore) * 100),
        misses: score.misses - previousScore.misses,
        missedNotes: score.missedNotes - previousScore.missedNotes,
        badCuts: score.badCuts - previousScore.badCuts,
        pp: score.pp - previousScore.pp,
        weight: score.weight && previousScore.weight && score.weight - previousScore.weight,
        maxCombo: score.maxCombo - previousScore.maxCombo,
      },
    } as ScoreSaberPreviousScoreOverview;
  }

  /**
   * Gets friend scores for a leaderboard.
   *
   * @param friendIds the friend ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   */
  public static async getFriendScores(
    friendIds: string[],
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const scores: ScoreSaberScore[] = await fetchWithCache(
      CacheService.getCache(ServiceCache.FriendScores),
      `friend-scores:${friendIds.join(",")}-${leaderboardId}`,
      async () => {
        const scores: ScoreSaberScore[] = [];
        for (const friendId of friendIds) {
          await PlayerService.getPlayer(friendId); // Ensures player exists

          const friendScores = await ScoreSaberScoreModel.aggregate([
            { $match: { playerId: friendId, leaderboardId: leaderboardId } },
            { $sort: { timestamp: -1 } },
            { $sort: { "score.score": -1 } },
          ]);
          for (const friendScore of friendScores) {
            const score = new ScoreSaberScoreModel(friendScore.score).toObject() as ScoreSaberScore;
            scores.push(await ScoreSaberService.insertScoreData(score));
          }
        }

        return scores;
      }
    );

    if (scores.length === 0) {
      throw new NotFoundError(`No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`);
    }

    const pagination = new Pagination<ScoreSaberScore>();
    pagination.setItems(scores);
    pagination.setTotalItems(scores.length);
    pagination.setItemsPerPage(8);
    return pagination.getPage(page);
  }

  /**
   * Tracks ScoreSaber score.
   *
   * @param scoreToken the score to track
   * @param leaderboardToken the leaderboard for the score
   * @param playerId the id of the player
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    scoreToken: ScoreSaberScoreToken,
    leaderboardToken: ScoreSaberLeaderboardToken,
    playerId?: string
  ) {
    const before = performance.now();
    playerId = (scoreToken.leaderboardPlayerInfo && scoreToken.leaderboardPlayerInfo.id) || playerId;
    if (!playerId) {
      console.error(`Player ID is undefined, unable to track score: ${scoreToken.id}`);
      return;
    }

    const playerName = (scoreToken.leaderboardPlayerInfo && scoreToken.leaderboardPlayerInfo.name) || "Unknown";
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const score = getScoreSaberScoreFromToken(scoreToken, leaderboard, playerId);

    if (await ScoreSaberService.scoreExists(playerId, leaderboard, score)) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete score.playerInfo;

    // Remove the old score and create a new previous score
    const previousScore = await ScoreSaberScoreModel.findOne({
      playerId: playerId,
      leaderboardId: leaderboard.id,
    });
    if (previousScore) {
      await ScoreSaberScoreModel.deleteOne({
        playerId: playerId,
        leaderboardId: leaderboard.id,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = previousScore.toObject();
      await ScoreSaberPreviousScoreModel.create(rest);

      console.log(
        [
          `Removed old score for "${playerName}"(${playerId})`,
          `leaderboard: ${leaderboard.id}`,
          `in ${(performance.now() - before).toFixed(0)}ms`,
        ]
          .filter(s => s !== undefined)
          .join(", ")
      );
    }

    await ScoreSaberScoreModel.create(score);
    console.log(
      [
        `Tracked ScoreSaber score for "${playerName}"(${playerId})`,
        `difficulty: ${score.difficulty}`,
        `score: ${score.score}`,
        score.pp > 0 ? `pp: ${score.pp.toFixed(2)}pp` : undefined,
        `leaderboard: ${leaderboard.id}`,
        `hmd: ${score.hmd}`,
        score.controllers !== undefined ? `controller left: ${score.controllers.leftController}` : undefined,
        score.controllers !== undefined ? `controller right: ${score.controllers.rightController}` : undefined,
        `in ${(performance.now() - before).toFixed(0)}ms`,
      ]
        .filter(s => s !== undefined)
        .join(", ")
    );
    return true;
  }

  /**
   * Gets the top tracked scores.
   *
   * @param amount the amount of scores to get
   * @param timeframe the timeframe to filter by
   * @returns the top scores
   */
  public static async getTopScores(amount: number = 100, timeframe: Timeframe) {
    console.log(`Getting top scores for timeframe: ${timeframe}, limit: ${amount}...`);
    const before = Date.now();

    let daysAgo = -1;
    if (timeframe === "daily") {
      daysAgo = 1;
    } else if (timeframe === "weekly") {
      daysAgo = 8;
    } else if (timeframe === "monthly") {
      daysAgo = 31;
    }
    const date: Date = daysAgo == -1 ? new Date(0) : getDaysAgoDate(daysAgo);
    const foundScores = await ScoreSaberScoreModel.aggregate([
      { $match: { timestamp: { $gte: date }, pp: { $gt: 0 } } },
      { $sort: { "score.pp": -1 } },
      { $limit: amount },
    ]);

    const scores: (PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> | null)[] = await Promise.all(
      foundScores.map(async rawScore => {
        let score = new ScoreSaberScoreModel(rawScore).toObject() as ScoreSaberScore;

        const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
          "scoresaber",
          score.leaderboardId + ""
        );
        if (!leaderboardResponse) {
          return null; // Skip this score if no leaderboardResponse is found
        }

        const { leaderboard, beatsaver } = leaderboardResponse;

        try {
          const player = await PlayerService.getPlayer(score.playerId);
          if (player) {
            score.playerInfo = {
              id: player.id,
              name: player.name,
            };
          }
        } catch {
          score.playerInfo = {
            id: score.playerId,
          };
        }

        score = await ScoreSaberService.insertScoreData(score, leaderboard);
        return {
          score: score,
          leaderboard: leaderboard,
          beatSaver: beatsaver,
        };
      })
    );

    // Filter out any null entries that might result from skipped scores
    const filteredScores = scores.filter(score => score !== null) as PlayerScore<
      ScoreSaberScore,
      ScoreSaberLeaderboard
    >[];

    console.log(
      `Got ${filteredScores.length} scores in ${Date.now() - before}ms (timeframe: ${timeframe}, limit: ${amount})`
    );
    return filteredScores;
  }

  /**
   * Inserts the score data into the score.
   *
   * @param score the score to insert data into
   * @param leaderboard the leaderboard to get the data from
   * @returns the score with the data inserted
   */
  public static async insertScoreData(score: ScoreSaberScore, leaderboard?: ScoreSaberLeaderboard) {
    leaderboard = !leaderboard
      ? (await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>("scoresaber", score.leaderboardId + ""))
          .leaderboard
      : leaderboard;

    // If the leaderboard is not found, return the plain score
    if (!leaderboard) {
      return score;
    }

    const [additionalData, previousScore] = await Promise.all([
      BeatLeaderService.getAdditionalScoreData(
        score.playerId,
        leaderboard.songHash,
        `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
        score.score
      ),
      ScoreSaberService.getPreviousScore(score.playerId, score, leaderboard, score.timestamp),
    ]);

    if (additionalData !== undefined) {
      score.additionalData = additionalData.toObject();
    }
    if (previousScore) {
      score.previousScore = previousScore;
    }

    try {
      const scorePpBoundary =
        score.pp > 0 ? await PlayerService.getPlayerPpBoundaryFromScorePp(score.playerId, score.pp) : undefined;
      if (scorePpBoundary) {
        score.ppBoundary = scorePpBoundary;
      }
    } catch {
      // ignored
    }

    return score;
  }
}
