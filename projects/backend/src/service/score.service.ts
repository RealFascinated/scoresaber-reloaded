import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/score-saber-player-score-token";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { Metadata } from "@ssr/common/types/metadata";
import { NotFoundError } from "elysia";
import BeatSaverService from "./beatsaver.service";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { getScoreSaberScoreFromToken } from "@ssr/common/score/impl/scoresaber-score";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { Leaderboards } from "@ssr/common/leaderboard";
import Leaderboard from "@ssr/common/leaderboard/leaderboard";
import LeaderboardService from "./leaderboard.service";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/beatsaver-map";
import { PlayerScore } from "@ssr/common/score/player-score";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import Score from "@ssr/common/score/score";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";
import { Config } from "@ssr/common/config";
import { SSRCache } from "@ssr/common/cache";
import { fetchWithCache } from "../common/cache.util";

const playerScoresCache = new SSRCache({
  ttl: 1000 * 60, // 1 minute
});

const leaderboardScoresCache = new SSRCache({
  ttl: 1000 * 60, // 1 minute
});

export class ScoreService {
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
    const score = getScoreSaberScoreFromToken(scoreToken, leaderboardToken);
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const playerInfo = score.playerInfo;
    const player = await scoresaberService.lookupPlayer(playerInfo.id);
    if (!player) {
      return;
    }

    // Not ranked
    if (leaderboard.stars <= 0) {
      return;
    }
    // Not #1 rank
    if (score.rank !== 1) {
      return;
    }

    await logToChannel(
      DiscordChannels.numberOneFeed,
      new EmbedBuilder()
        .setTitle(`${player.name} just set a #1!`)
        .setDescription(
          [
            `${leaderboard.songName} ${leaderboard.songSubName} (${leaderboard.difficulty.difficulty} ${leaderboard.stars.toFixed(2)}★)`,
            `([Player])(${Config.websiteUrl}/player/${player.id}) ([Leaderboard])(${Config.websiteUrl}/leaderboard/${leaderboard.id})`,
          ].join("\n")
        )
        .addFields([
          {
            name: "Accuracy",
            value: `${score.accuracy.toFixed(2)}%`,
            inline: true,
          },
          {
            name: "PP",
            value: `${formatPp(score.pp)}pp`,
            inline: true,
          },
          {
            name: "Player Rank",
            value: `#${formatNumberWithCommas(player.rank)}`,
            inline: true,
          },
          {
            name: "Misses",
            value: formatNumberWithCommas(score.missedNotes),
            inline: true,
          },
          {
            name: "Bad Cuts",
            value: formatNumberWithCommas(score.badCuts),
            inline: true,
          },
          {
            name: "Max Combo",
            value: formatNumberWithCommas(score.maxCombo),
            inline: true,
          },
        ])
        .setThumbnail(leaderboard.songArt)
        .setTimestamp(score.timestamp)
        .setColor("#00ff00")
    );
  }

  /**
   * Gets scores for a player.
   *
   * @param leaderboardName the leaderboard to get the scores from
   * @param id the players id
   * @param page the page to get
   * @param sort the sort to use
   * @param search the search to use
   * @returns the scores
   */
  public static async getPlayerScores(
    leaderboardName: Leaderboards,
    id: string,
    page: number,
    sort: string,
    search?: string
  ): Promise<PlayerScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      playerScoresCache,
      `player-scores-${leaderboardName}-${id}-${page}-${sort}-${search}`,
      async () => {
        const scores: PlayerScore<unknown, unknown>[] | undefined = [];
        let beatSaverMap: BeatSaverMap | undefined;
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        switch (leaderboardName) {
          case "scoresaber": {
            const leaderboardScores = await scoresaberService.lookupPlayerScores({
              playerId: id,
              page: page,
              sort: sort as ScoreSort,
              search: search,
            });
            if (leaderboardScores == undefined) {
              break;
            }

            metadata = new Metadata(
              Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
              leaderboardScores.metadata.total,
              leaderboardScores.metadata.page,
              leaderboardScores.metadata.itemsPerPage
            );

            for (const token of leaderboardScores.playerScores) {
              const score = getScoreSaberScoreFromToken(token.score);
              if (score == undefined) {
                continue;
              }
              const tokenLeaderboard = getScoreSaberLeaderboardFromToken(token.leaderboard);
              if (tokenLeaderboard == undefined) {
                continue;
              }
              beatSaverMap = await BeatSaverService.getMap(tokenLeaderboard.songHash);

              scores.push({
                score: score,
                leaderboard: tokenLeaderboard,
                beatSaver: beatSaverMap,
              });
            }
            break;
          }
          default: {
            throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
          }
        }

        return {
          scores: scores,
          metadata: metadata,
        };
      }
    );
  }

  /**
   * Gets scores for a leaderboard.
   *
   * @param leaderboardName the leaderboard to get the scores from
   * @param id the leaderboard id
   * @param page the page to get
   * @returns the scores
   */
  public static async getLeaderboardScores(
    leaderboardName: Leaderboards,
    id: string,
    page: number
  ): Promise<LeaderboardScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(leaderboardScoresCache, `leaderboard-scores-${leaderboardName}-${id}-${page}`, async () => {
      const scores: Score[] = [];
      let leaderboard: Leaderboard | undefined;
      let beatSaverMap: BeatSaverMap | undefined;
      let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

      switch (leaderboardName) {
        case "scoresaber": {
          const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardName, id);
          if (leaderboardResponse == undefined) {
            throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
          }
          leaderboard = leaderboardResponse.leaderboard;
          beatSaverMap = leaderboardResponse.beatsaver;

          const leaderboardScores = await scoresaberService.lookupLeaderboardScores(id, page);
          if (leaderboardScores == undefined) {
            break;
          }

          for (const token of leaderboardScores.scores) {
            const score = getScoreSaberScoreFromToken(token);
            if (score == undefined) {
              continue;
            }
            scores.push(score);
          }

          metadata = new Metadata(
            Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
            leaderboardScores.metadata.total,
            leaderboardScores.metadata.page,
            leaderboardScores.metadata.itemsPerPage
          );
          break;
        }
        default: {
          throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
        }
      }

      return {
        scores: scores,
        leaderboard: leaderboard,
        beatSaver: beatSaverMap,
        metadata: metadata,
      };
    });
  }
}
