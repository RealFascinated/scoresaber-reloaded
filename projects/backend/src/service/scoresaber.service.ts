import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { Metadata } from "@ssr/common/types/metadata";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { getPageFromRank, isProduction } from "@ssr/common/utils/utils";
import { NotFoundError } from "elysia";
import sanitize from "sanitize-html";
import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";
import LeaderboardService from "./leaderboard.service";
import { PlayerService } from "./player.service";
import { ScoreService } from "./score/score.service";
import { sendScoreNotification } from "../common/score/score.util";
import { DiscordChannels } from "../bot/bot";

export default class ScoreSaberService {
  /**
   * Notifies the number one score in Discord.
   *
   * @param playerScore the score to notify
   * @param mode the mode to notify in
   */
  public static async notifyScore(
    playerScore: ScoreSaberPlayerScoreToken,
    mode: "numberOne" | "top50AllTime" | "scoreFloodGate"
  ) {
    // Only notify in production
    if (!isProduction()) {
      return;
    }

    const { score: scoreToken, leaderboard: leaderboardToken } = playerScore;
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const score = getScoreSaberScoreFromToken(
      scoreToken,
      leaderboard,
      scoreToken.leaderboardPlayerInfo.id
    );
    const playerInfo = score.playerInfo;

    if (mode === "scoreFloodGate") {
      await sendScoreNotification(
        DiscordChannels.scoreFloodGateFeed,
        score,
        leaderboard,
        `${playerInfo.name} just set a #${score.rank}!`
      );
    }

    // Not ranked
    if (leaderboard.stars <= 0) {
      return;
    }

    if (mode === "numberOne" && score.rank === 1) {
      await sendScoreNotification(
        DiscordChannels.numberOneFeed,
        score,
        leaderboard,
        `${playerInfo.name} just set a #1!`
      );
      // No need to check this for all scores, so we only check if the score is top 50
    } else if (mode === "top50AllTime" && score.rank <= 50) {
      const top50Scores = await ScoreService.getTopScores(50, "all");
      const lowestPp = top50Scores.reduce((min, score) => Math.min(min, score.score.pp), Infinity);
      if (score.pp > lowestPp) {
        await sendScoreNotification(
          DiscordChannels.top50Feed,
          score,
          leaderboard,
          `${playerInfo.name} just set a new top 50 score!`
        );
      }
    }
  }

  /**
   * Gets a ScoreSaber player using their account id.
   *
   * @param id the player's account id
   * @param createIfMissing creates the player if they don't have an account with us
   * @returns the player
   */
  public static async getPlayer(
    id: string,
    type: DetailType = DetailType.BASIC,
    options?: { createIfMissing?: boolean }
  ): Promise<ScoreSaberPlayer> {
    const { createIfMissing = false } = options || {};

    return fetchWithCache<ScoreSaberPlayer>(
      CacheService.getCache(ServiceCache.ScoreSaber),
      `player:${id}:${type}`,
      async () => {
        const playerToken = await scoresaberService.lookupPlayer(id);
        const account = await PlayerService.getPlayer(id, createIfMissing, playerToken).catch(
          () => undefined
        );

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
        const [updatedAccount, accuracies, ppBoundaries, accBadges] = await Promise.all([
          account ? PlayerService.updatePeakRank(id, playerToken) : undefined,
          account
            ? PlayerService.getPlayerAverageAccuracies(playerToken.id)
            : { unrankedAccuracy: 0, averageAccuracy: 0 },
          account ? PlayerService.getPlayerPpBoundary(id, 50) : [],
          account ? PlayerService.getAccBadges(id) : {},
        ]);

        const statisticHistory = await PlayerService.getPlayerStatisticHistory(
          playerToken,
          account,
          accuracies,
          new Date(),
          getDaysAgoDate(30)
        );

        return {
          ...basePlayer,
          bio: {
            lines: playerToken.bio ? sanitize(playerToken.bio).split("\n") : [],
            linesStripped: playerToken.bio
              ? sanitize(playerToken.bio.replace(/<[^>]+>/g, "")).split("\n")
              : [],
          },
          badges:
            playerToken.badges?.map(badge => ({
              url: badge.image,
              description: badge.description,
            })) || [],
          statisticChange: {
            daily: account ? await getPlayerStatisticChanges(statisticHistory, 1) : {},
            weekly: account ? await getPlayerStatisticChanges(statisticHistory, 7) : {},
            monthly: account ? await getPlayerStatisticChanges(statisticHistory, 30) : {},
          },
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

  /**
   * Gets the player's statistic history.
   *
   * @param playerId the player's id
   * @param startDate the start date
   * @param endDate the end date
   * @returns the player's statistic history
   */
  public static async getPlayerStatisticHistory(playerId: string, startDate: Date, endDate: Date) {
    const player = await scoresaberService.lookupPlayer(playerId);
    if (!player) {
      throw new NotFoundError(`Player "${playerId}" not found`);
    }

    const [account, accuracies] = await Promise.all([
      PlayerService.getPlayer(player.id, false, player).catch(() => undefined),
      PlayerService.getPlayerAverageAccuracies(player.id),
    ]);

    return PlayerService.getPlayerStatisticHistory(player, account, accuracies, startDate, endDate);
  }

  /**
   * Looks up player scores.
   *
   * @param playerId the player id
   * @param page the page to get
   * @param sort the sort to get
   * @param search the search to get
   */
  public static async lookupPlayerScores(
    playerId: string,
    page: number,
    sort: string,
    search?: string
  ): Promise<PlayerScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.PlayerScores),
      `player-scores:${playerId}-${page}-${sort}-${search}`,
      async () => {
        const scores: PlayerScore<unknown, unknown>[] = [];
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        const leaderboardScores = await scoresaberService.lookupPlayerScores({
          playerId,
          page,
          sort: sort as ScoreSort,
          search,
        });
        if (leaderboardScores == undefined) {
          return undefined;
        }

        metadata = new Metadata(
          Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
          leaderboardScores.metadata.total,
          leaderboardScores.metadata.page,
          leaderboardScores.metadata.itemsPerPage
        );

        const scorePromises = leaderboardScores.playerScores.map(async token => {
          const leaderboardResponse = await LeaderboardService.getLeaderboard(
            token.leaderboard.id + "",
            {
              includeBeatSaver: true,
              beatSaverType: DetailType.FULL,
            }
          );

          if (!leaderboardResponse) {
            return undefined;
          }
          const { leaderboard, beatsaver } = leaderboardResponse;
          let score = getScoreSaberScoreFromToken(token.score, leaderboard, playerId);
          if (!score) {
            return undefined;
          }

          score = await ScoreService.insertScoreData(score, leaderboard);
          return {
            score: score,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
        });

        const resolvedScores = (await Promise.all(scorePromises)).filter(s => s !== undefined);
        scores.push(...resolvedScores);

        return {
          scores: scores,
          metadata: metadata,
        };
      }
    );
  }
}
