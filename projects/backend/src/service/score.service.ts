import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/score-saber-player-score-token";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { Metadata } from "@ssr/common/types/metadata";
import { NotFoundError } from "elysia";
import BeatSaverService from "./beatsaver.service";
import ScoreSaberLeaderboard, {
  getScoreSaberLeaderboardFromToken,
} from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
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
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/beatleader-score-token";
import {
  AdditionalScoreData,
  AdditionalScoreDataModel,
} from "../../../common/src/model/additional-score-data/additional-score-data";

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

    // Not ranked
    if (leaderboard.stars <= 0) {
      return;
    }
    // Not #1 rank
    if (score.rank !== 1) {
      return;
    }

    const player = await scoresaberService.lookupPlayer(playerInfo.id);
    if (!player) {
      return;
    }

    await logToChannel(
      DiscordChannels.numberOneFeed,
      new EmbedBuilder()
        .setTitle(`${player.name} just set a #1!`)
        .setDescription(
          [
            `${leaderboard.songName} ${leaderboard.songSubName} (${leaderboard.difficulty.difficulty} ${leaderboard.stars.toFixed(2)}★)`,
            `[[Player]](${Config.websiteUrl}/player/${player.id}) [[Leaderboard]](${Config.websiteUrl}/leaderboard/${leaderboard.id})`,
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
   * Tracks ScoreSaber score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard to track
   */
  public static async trackScoreSaberScore({ score, leaderboard }: ScoreSaberPlayerScoreToken) {
    const playerId = score.leaderboardPlayerInfo.id;
    const playerName = score.leaderboardPlayerInfo.name;
    const player: PlayerDocument | null = await PlayerModel.findById(playerId);
    // Player is not tracked, so ignore the score.
    if (player == undefined) {
      return;
    }

    const today = new Date();
    const history = player.getHistoryByDate(today);
    const scores = history.scores || {
      rankedScores: 0,
      unrankedScores: 0,
    };
    if (leaderboard.stars > 0) {
      scores.rankedScores!++;
    } else {
      scores.unrankedScores!++;
    }

    history.scores = scores;
    player.setStatisticHistory(today, history);
    player.sortStatisticHistory();

    // Save the changes
    player.markModified("statisticHistory");
    await player.save();

    console.log(
      `Updated scores set statistic for "${playerName}"(${playerId}), scores today: ${scores.rankedScores} ranked, ${scores.unrankedScores} unranked`
    );
  }

  /**
   * Tracks BeatLeader score.
   *
   * @param score the score to track
   */
  public static async trackBeatLeaderScore(score: BeatLeaderScoreToken) {
    const { playerId, player: scorePlayer, leaderboard } = score;
    const player: PlayerDocument | null = await PlayerModel.findById(playerId);
    // Player is not tracked, so ignore the score.
    if (player == undefined) {
      return;
    }

    // The score has already been tracked, so ignore it.
    if (
      (await this.getAdditionalScoreData(
        playerId,
        leaderboard.song.hash,
        leaderboard.difficulty.difficultyName,
        score.baseScore
      )) !== undefined
    ) {
      return;
    }

    const difficulty = leaderboard.difficulty;
    const difficultyKey = `${difficulty.difficultyName.replace("Plus", "+")}-${difficulty.modeName}`;
    const rawScoreImprovement = score.scoreImprovement;
    const data = {
      playerId: playerId,
      songHash: leaderboard.song.hash.toUpperCase(),
      songDifficulty: difficultyKey,
      songScore: score.baseScore,
      misses: {
        misses: score.missedNotes + score.badCuts,
        missedNotes: score.missedNotes,
        bombCuts: score.bombCuts,
        badCuts: score.badCuts,
        wallsHit: score.wallsHit,
      },
      pauses: score.pauses,
      fcAccuracy: score.fcAccuracy * 100,
      fullCombo: score.fullCombo,
      handAccuracy: {
        left: score.accLeft,
        right: score.accRight,
      },
    } as AdditionalScoreData;
    if (rawScoreImprovement.score > 0) {
      data.scoreImprovement = {
        score: rawScoreImprovement.score,
        misses: {
          misses: rawScoreImprovement.missedNotes + rawScoreImprovement.badCuts,
          missedNotes: rawScoreImprovement.missedNotes,
          bombCuts: rawScoreImprovement.bombCuts,
          badCuts: rawScoreImprovement.badCuts,
          wallsHit: rawScoreImprovement.wallsHit,
        },
        accuracy: rawScoreImprovement.accuracy * 100,
        fullCombo:
          rawScoreImprovement.missedNotes == 0 &&
          rawScoreImprovement.bombCuts == 0 &&
          rawScoreImprovement.badCuts == 0 &&
          rawScoreImprovement.wallsHit == 0,
        handAccuracy: {
          left: rawScoreImprovement.accLeft,
          right: rawScoreImprovement.accRight,
        },
      };
    }

    await AdditionalScoreDataModel.create(data);
    console.log(
      `Tracked additional score data for "${scorePlayer.name}"(${playerId}), difficulty: ${difficultyKey}, score: ${score.baseScore}`
    );
  }

  /**
   * Gets the additional score data for a player's score.
   *
   * @param playerId the id of the player
   * @param songHash the hash of the map
   * @param songDifficulty the difficulty of the map
   * @param songScore the score of the play
   * @private
   */
  private static async getAdditionalScoreData(
    playerId: string,
    songHash: string,
    songDifficulty: string,
    songScore: number
  ): Promise<AdditionalScoreData | undefined> {
    const additionalData = await AdditionalScoreDataModel.findOne({
      playerId: playerId,
      songHash: songHash.toUpperCase(),
      songDifficulty: songDifficulty,
      songScore: songScore,
    });
    if (!additionalData) {
      return undefined;
    }
    return additionalData.toObject();
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
              const score = getScoreSaberScoreFromToken(token.score, token.leaderboard);
              if (score == undefined) {
                continue;
              }
              const tokenLeaderboard = getScoreSaberLeaderboardFromToken(token.leaderboard);
              if (tokenLeaderboard == undefined) {
                continue;
              }

              const additionalData = await this.getAdditionalScoreData(
                id,
                tokenLeaderboard.songHash,
                `${tokenLeaderboard.difficulty.difficulty}-${tokenLeaderboard.difficulty.gameMode}`,
                score.score
              );
              if (additionalData !== undefined) {
                score.additionalData = additionalData;
              }

              scores.push({
                score: score,
                leaderboard: tokenLeaderboard,
                beatSaver: await BeatSaverService.getMap(tokenLeaderboard.songHash),
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
          const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
            leaderboardName,
            id
          );
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
            const score = getScoreSaberScoreFromToken(token, leaderboardResponse.leaderboard);
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
