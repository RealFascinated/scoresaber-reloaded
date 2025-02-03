import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { NotFoundError } from "elysia";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import sanitize from "sanitize-html";
import { PlayerHistory } from "@ssr/common/player/player-history";
import { PlayerService } from "./player.service";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { formatChange, getPageFromRank, isProduction } from "@ssr/common/utils/utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { Config } from "@ssr/common/config";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";
import BeatSaverService from "./beatsaver.service";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import { ScoreService } from "./score.service";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { DetailType } from "@ssr/common/detail-type";

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

    const previousScore = await ScoreService.getPreviousScore(player.id, score, leaderboard, score.timestamp);
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
  public static async getPlayer(id: string, type: DetailType = DetailType.BASIC, createIfMissing?: boolean): Promise<ScoreSaberPlayer> {
    return fetchWithCache<ScoreSaberPlayer>(
      CacheService.getCache(ServiceCache.ScoreSaber),
      `player:${id}:${type}`,
      async () => {
        const playerToken = await scoresaberService.lookupPlayer(id);
        const account = await PlayerService.getPlayer(id, createIfMissing, playerToken).catch(() => undefined);

        if (!playerToken) {
          throw new NotFoundError(`Player "${id}" not found`);
        }

        // For basic type, return early with minimal data
        const basePlayer = {
          id: playerToken.id,
          name: playerToken.name,
          avatar: playerToken.profilePicture,
          country: playerToken.country,
          rank: playerToken.rank,
          countryRank: playerToken.countryRank,
          pp: playerToken.pp,
          hmd: await PlayerService.getPlayerHMD(playerToken.id),
          joinedDate: new Date(playerToken.firstSeen),
          role: playerToken.role ?? undefined,
          permissions: playerToken.permissions,
          banned: playerToken.banned,
          inactive: playerToken.inactive,
          isBeingTracked: account !== undefined,
        } as ScoreSaberPlayer;

        if (type === DetailType.BASIC) {
          return basePlayer;
        }

        // For full type, run these operations in parallel
        const [
          updatedAccount,
          accuracies,
          ppBoundaries,
          accBadges
        ] = await Promise.all([
          account ? PlayerService.updatePeakRank(id, playerToken) : undefined,
          account ? PlayerService.getPlayerAverageAccuracies(playerToken.id) : { unrankedAccuracy: 0, averageAccuracy: 0 },
          account ? PlayerService.getPlayerPpBoundary(id, 100) : [],
          account ? PlayerService.getAccBadges(id) : {},
        ]);

        // Process history data
        let statisticHistory: Record<string, PlayerHistory> = 
          account && type === "full" ? account.getHistoryPreviousDays(50) : {};
        
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
                    averageUnrankedAccuracy: accuracies.unrankedAccuracy,
                    averageAccuracy: accuracies.averageAccuracy,
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

        if (account !== undefined && type === "full") {
          for (const [date, history] of Object.entries(statisticHistory)) {
            if (history.plusOnePp) {
              history.plusOnePp = Math.round(history.plusOnePp * Math.pow(10, 2)) / Math.pow(10, 2); // Round to 2 decimal places
              statisticHistory[date] = history;
            }
          }
        }

        return {
          ...basePlayer,
          bio: {
            lines: playerToken.bio ? sanitize(playerToken.bio).split("\n") : [],
            linesStripped: playerToken.bio ? sanitize(playerToken.bio.replace(/<[^>]+>/g, "")).split("\n") : [],
          },
          badges: playerToken.badges?.map(badge => ({
            url: badge.image,
            description: badge.description,
          })) || [],
          statisticChange: {
            daily: account ? await getPlayerStatisticChanges(statisticHistory, 1) : {},
            weekly: account ? await getPlayerStatisticChanges(statisticHistory, 7) : {},
            monthly: account ? await getPlayerStatisticChanges(statisticHistory, 30) : {},
          },
          statisticHistory,
          ppBoundaries,
          accBadges,
          peakRank: updatedAccount?.peakRank,
          statistics: playerToken.scoreStats,
          rankPages: {
            global: getPageFromRank(playerToken.rank, 50),
            country: getPageFromRank(playerToken.countryRank, 50),
          },
        } as ScoreSaberPlayer;
      }
    );
  }
}
