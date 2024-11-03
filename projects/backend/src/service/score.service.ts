import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatChange, isProduction, kyFetchBuffer } from "@ssr/common/utils/utils";
import { Metadata } from "@ssr/common/types/metadata";
import { NotFoundError } from "elysia";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { Leaderboards } from "@ssr/common/leaderboard";
import LeaderboardService from "./leaderboard.service";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { PlayerScore } from "@ssr/common/score/player-score";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";
import { Config } from "@ssr/common/config";
import { SSRCache } from "@ssr/common/cache";
import { fetchWithCache } from "../common/cache.util";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import {
  AdditionalScoreData,
  AdditionalScoreDataModel,
} from "@ssr/common/model/additional-score-data/additional-score-data";
import { BeatLeaderScoreImprovementToken } from "@ssr/common/types/token/beatleader/score/score-improvement";
import { ScoreType } from "@ssr/common/model/score/score";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import {
  ScoreSaberPreviousScore,
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboardToken from "../../../common/src/types/token/scoresaber/leaderboard";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberLeaderboard, {
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Leaderboard from "@ssr/common/model/leaderboard/leaderboard";
import { Timeframe } from "@ssr/common/timeframe";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { PlayerService } from "./player.service";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import BeatSaverService from "./beatsaver.service";
import { beatLeaderService } from "@ssr/common/service/impl/beatleader";
import MinioService from "./minio.service";
import { MinioBucket } from "@ssr/common/minio-buckets";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";

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

    const beatSaver = await BeatSaverService.getMap(leaderboard.songHash);
    const player = await scoresaberService.lookupPlayer(playerInfo.id);
    if (!player) {
      return;
    }

    const previousScore = await ScoreService.getPreviousScore(player.id, leaderboard, score.timestamp);
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
            `${leaderboard.songName} ${leaderboard.songSubName} (${leaderboard.difficulty.difficulty} ${leaderboard.stars.toFixed(2)}★)`,
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
            value: `${formatNumberWithCommas(score.maxCombo)} ${change ? change.maxCombo : ""}`,
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
   * Updates the players set scores count for today.
   *
   * @param score the score
   */
  public static async updatePlayerScoresSet({
    score: scoreToken,
    leaderboard: leaderboardToken,
  }: ScoreSaberPlayerScoreToken) {
    const playerId = scoreToken.leaderboardPlayerInfo.id;

    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
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
    player.markModified("statisticHistory");
    await player.save();
  }

  /**
   * Gets the player scores from the database.
   *
   * @param playerId the id of the player
   * @param options the fetch options
   */
  public static async getPlayerScores(
    playerId: string,
    options?: {
      ranked?: boolean;
    }
  ): Promise<ScoreSaberScore[]> {
    const rawScores = await ScoreSaberScoreModel.aggregate([
      { $match: { playerId: playerId, ...(options?.ranked ? { pp: { $gt: 0 } } : undefined) } },
      {
        $group: {
          _id: { leaderboardId: "$leaderboardId", playerId: "$playerId" },
          score: { $first: "$$ROOT" },
        },
      },
      { $sort: { "score.pp": -1 } },
    ]);
    if (!rawScores) {
      return [];
    }
    return rawScores.map(({ score }) => new ScoreSaberScoreModel(score).toObject() as ScoreSaberScore);
  }

  /**
   * Tracks ScoreSaber score.
   *
   * @param scoreToken the score to track
   * @param leaderboardToken the leaderboard for the score
   * @param playerId the id of the player
   */
  public static async trackScoreSaberScore(
    scoreToken: ScoreSaberScoreToken,
    leaderboardToken: ScoreSaberLeaderboardToken,
    playerId?: string
  ) {
    playerId = (scoreToken.leaderboardPlayerInfo && scoreToken.leaderboardPlayerInfo.id) || playerId;
    if (!playerId) {
      console.error(`Player ID is undefined, unable to track score: ${scoreToken.id}`);
      return;
    }

    const playerName = (scoreToken.leaderboardPlayerInfo && scoreToken.leaderboardPlayerInfo.name) || "Unknown";

    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    await ScoreSaberLeaderboardModel.updateOne(
      { _id: leaderboard.id },
      { $setOnInsert: { _id: leaderboard.id, lastRefreshed: new Date(), ...leaderboard } },
      { upsert: true }
    );

    const score = getScoreSaberScoreFromToken(scoreToken, leaderboard, playerId);
    const player: PlayerDocument | null = await PlayerModel.findById(playerId);
    // Player is not tracked, so ignore the score.
    if (player == undefined) {
      return;
    }

    // Update player name
    if (playerName !== "Unknown") {
      player.name = playerName;
      await player.save();
    }

    // The score has already been tracked, so ignore it.
    if (
      (await this.getScoreSaberScore(
        playerId,
        leaderboard.id + "",
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        score.score
      )) !== null
    ) {
      // console.log(
      //   `ScoreSaber score already tracked for "${playerName}"(${playerId}), difficulty: ${score.difficulty}, score: ${score.score}, leaderboard: ${leaderboard.id}, ignoring...`
      // );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete score.playerInfo;

    await ScoreSaberScoreModel.create(score);
    console.log(
      `Tracked ScoreSaber score for "${playerName}"(${playerId}), difficulty: ${score.difficulty}, score: ${score.score}, pp: ${score.pp.toFixed(2)}pp, leaderboard: ${leaderboard.id}`
    );
  }

  /**
   * Tracks BeatLeader score.
   *
   * @param score the score to track
   */
  public static async trackBeatLeaderScore(score: BeatLeaderScoreToken) {
    const before = Date.now();
    const { playerId, player: scorePlayer, leaderboard } = score;
    const player: PlayerDocument | null = await PlayerModel.findById(playerId);
    // Player is not tracked, so ignore the score.
    if (player == undefined) {
      return;
    }

    let savedScoreStats = false;
    let savedReplayId: string | undefined;

    // Only save score stats and replays in production
    if (isProduction()) {
      // Cache score stats for this score
      const scoreStats = await beatLeaderService.lookupScoreStats(score.id);
      if (scoreStats !== undefined) {
        try {
          await MinioService.saveFile(
            MinioBucket.BeatLeaderScoreStats,
            `${score.id}.json`,
            Buffer.from(JSON.stringify(scoreStats))
          );
          savedScoreStats = true;
        } catch (error) {
          console.error(`Failed to save score stats for ${score.id}: ${error}`);
        }
      }

      // Cache replay for this score
      try {
        const replayId = `${score.id}-${playerId}-${leaderboard.difficulty.difficultyName}-${leaderboard.difficulty.modeName}-${leaderboard.song.hash.toUpperCase()}.bsor`;
        const replayData = await kyFetchBuffer(`https://cdn.replays.beatleader.xyz/${replayId}`);

        if (replayData !== undefined) {
          await MinioService.saveFile(MinioBucket.BeatLeaderReplays, `${replayId}`, Buffer.from(replayData));
          savedReplayId = replayId;
        }
      } catch (error) {
        console.error(`Failed to save replay for ${score.id}: ${error}`);
      }

      // Remove old replays
      await this.cleanupScoreReplays(playerId, leaderboard.id);
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

    const getMisses = (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) => {
      return score.missedNotes + score.badCuts + score.bombCuts;
    };

    const difficulty = leaderboard.difficulty;
    const difficultyKey = `${difficulty.difficultyName}-${difficulty.modeName}`;
    const rawScoreImprovement = score.scoreImprovement;
    const data = {
      playerId: playerId,
      songHash: leaderboard.song.hash.toUpperCase(),
      songDifficulty: difficultyKey,
      songScore: score.baseScore,
      scoreId: score.id,
      leaderboardId: leaderboard.id,
      misses: {
        misses: getMisses(score),
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
      cachedScoreStats: savedScoreStats,
      cachedReplayId: savedReplayId,
      timestamp: new Date(Number(score.timeset) * 1000),
    } as AdditionalScoreData;
    if (rawScoreImprovement && rawScoreImprovement.score > 0) {
      data.scoreImprovement = {
        score: rawScoreImprovement.score,
        misses: {
          misses: getMisses(rawScoreImprovement),
          missedNotes: rawScoreImprovement.missedNotes,
          bombCuts: rawScoreImprovement.bombCuts,
          badCuts: rawScoreImprovement.badCuts,
          wallsHit: rawScoreImprovement.wallsHit,
        },
        accuracy: rawScoreImprovement.accuracy * 100,
        pauses: rawScoreImprovement.pauses,
        handAccuracy: {
          left: rawScoreImprovement.accLeft,
          right: rawScoreImprovement.accRight,
        },
      };
    }

    await AdditionalScoreDataModel.create(data);

    console.log(
      `Tracked additional score data for "${scorePlayer.name}"(${playerId}), difficulty: ${difficultyKey}, score: ${score.baseScore} in ${Date.now() - before}ms`
    );
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
      {
        $group: {
          _id: { leaderboardId: "$leaderboardId", playerId: "$playerId" },
          score: { $first: "$$ROOT" },
        },
      },
      { $sort: { "score.pp": -1 } },
      { $limit: amount },
    ]);

    const scores: (PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> | null)[] = await Promise.all(
      foundScores.map(async ({ score: scoreData }) => {
        const score = new ScoreSaberScoreModel(scoreData).toObject() as ScoreSaberScore;

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

        const [additionalData, previousScore] = await Promise.all([
          this.getAdditionalScoreData(
            score.playerId,
            leaderboard.songHash,
            `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
            score.score
          ),
          this.getPreviousScore(score.playerId, leaderboard, score.timestamp),
        ]);

        if (additionalData) {
          score.additionalData = additionalData;
        }
        if (previousScore) {
          score.previousScore = previousScore;
        }

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
   * Gets a ScoreSaber score.
   *
   * @param playerId the player who set the score
   * @param leaderboardId the leaderboard id the score was set on
   * @param difficulty the difficulty played
   * @param characteristic the characteristic played
   * @param score the score of the score set
   */
  public static async getScoreSaberScore(
    playerId: string,
    leaderboardId: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    score: number
  ) {
    return ScoreSaberScoreModel.findOne({
      playerId: playerId,
      leaderboardId: leaderboardId,
      difficulty: difficulty,
      characteristic: characteristic,
      score: score,
    });
  }

  public static async lookupPlayerScores(
    leaderboardName: Leaderboards,
    playerId: string,
    page: number,
    sort: string,
    search?: string
  ): Promise<PlayerScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      playerScoresCache,
      `player-scores-${leaderboardName}-${playerId}-${page}-${sort}-${search}`,
      async () => {
        const scores: PlayerScore<unknown, unknown>[] = [];
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        switch (leaderboardName) {
          case "scoresaber": {
            const leaderboardScores = await scoresaberService.lookupPlayerScores({
              playerId,
              page,
              sort: sort as ScoreSort,
              search,
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

            const scorePromises = leaderboardScores.playerScores.map(async token => {
              const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
                "scoresaber",
                token.leaderboard.id + "",
                token.leaderboard
              );

              if (!leaderboardResponse) {
                return undefined;
              }
              const { leaderboard, beatsaver } = leaderboardResponse;
              const score = getScoreSaberScoreFromToken(token.score, leaderboard, playerId);
              if (!score) {
                return undefined;
              }

              // Fetch additional data, previous score, and BeatSaver map concurrently
              const [additionalData, previousScore] = await Promise.all([
                this.getAdditionalScoreData(
                  playerId,
                  leaderboard.songHash,
                  `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
                  score.score
                ),
                this.getPreviousScore(playerId, leaderboard, score.timestamp),
              ]);

              if (additionalData) {
                score.additionalData = additionalData;
              }
              if (previousScore) {
                score.previousScore = previousScore;
              }

              return {
                score: score,
                leaderboard: leaderboard,
                beatSaver: beatsaver,
              } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
            });

            const resolvedScores = (await Promise.all(scorePromises)).filter(
              (s): s is PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> => s !== undefined
            );
            scores.push(...resolvedScores);
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
   * @param leaderboardId the leaderboard id
   * @param page the page to get
   * @returns the scores
   */
  public static async getLeaderboardScores(
    leaderboardName: Leaderboards,
    leaderboardId: string,
    page: number
  ): Promise<LeaderboardScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      leaderboardScoresCache,
      `leaderboard-scores-${leaderboardName}-${leaderboardId}-${page}`,
      async () => {
        const scores: ScoreType[] = [];
        let leaderboard: Leaderboard | undefined;
        let beatSaverMap: BeatSaverMap | undefined;
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        switch (leaderboardName) {
          case "scoresaber": {
            const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
              leaderboardName,
              leaderboardId
            );
            if (leaderboardResponse == undefined) {
              throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
            }
            leaderboard = leaderboardResponse.leaderboard;
            beatSaverMap = leaderboardResponse.beatsaver;

            const leaderboardScores = await scoresaberService.lookupLeaderboardScores(leaderboardId, page);
            if (leaderboardScores == undefined) {
              break;
            }

            for (const token of leaderboardScores.scores) {
              const score = getScoreSaberScoreFromToken(
                token,
                leaderboardResponse.leaderboard,
                token.leaderboardPlayerInfo.id
              );
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
      }
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
    const scores = await ScoreSaberScoreModel.find({ playerId: playerId, leaderboardId: leaderboardId })
      .sort({ timestamp: -1 })
      .skip(1);
    if (scores == null || scores.length == 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    return new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(8)
      .setTotalItems(scores.length)
      .getPage(page, async () => {
        const toReturn: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = [];
        for (const score of scores) {
          const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
            "scoresaber",
            leaderboardId
          );
          if (leaderboardResponse == undefined) {
            throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
          }
          const { leaderboard, beatsaver } = leaderboardResponse;

          const additionalData = await this.getAdditionalScoreData(
            playerId,
            leaderboard.songHash,
            `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
            score.score
          );
          if (additionalData !== undefined) {
            score.additionalData = additionalData;
          }
          const previousScore = await this.getPreviousScore(playerId, leaderboard, score.timestamp);
          if (previousScore !== undefined) {
            score.previousScore = previousScore;
          }

          toReturn.push({
            score: score as unknown as ScoreSaberScore,
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
   * @param leaderboard the leaderboard to get the previous score on
   * @param timestamp the score's timestamp to get the previous score for
   * @returns the score, or undefined if none
   */
  public static async getPreviousScore(
    playerId: string,
    leaderboard: Leaderboard,
    timestamp: Date
  ): Promise<ScoreSaberPreviousScore | undefined> {
    const scores = await ScoreSaberScoreModel.find({ playerId: playerId, leaderboardId: leaderboard.id }).sort({
      timestamp: -1,
    });
    if (scores == null || scores.length == 0) {
      return undefined;
    }

    const scoreIndex = scores.findIndex(score => score.timestamp.getTime() == timestamp.getTime());
    const score = scores.find(score => score.timestamp.getTime() == timestamp.getTime());
    if (scoreIndex == -1 || score == undefined) {
      return undefined;
    }
    const previousScore = scores[scoreIndex + 1];
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
    } as ScoreSaberPreviousScore;
  }

  /**
   * Cleans up the score replays for a player.
   *
   * @param playerId the player id to clean up
   * @param leaderboardId the leaderboard to clean up for the player
   */
  public static async cleanupScoreReplays(playerId: string, leaderboardId: string) {
    // todo: check premium status of the user and keep all replays.
    const scores = await AdditionalScoreDataModel.find({ playerId: playerId, leaderboardId: leaderboardId })
      .sort({
        timestamp: -1,
      })
      .skip(3); // Store last 3 replays.

    if (scores == null || scores.length == 0) {
      return;
    }

    for (const score of scores) {
      if (score.cachedReplayId == undefined) {
        return;
      }
      try {
        await MinioService.deleteFile(MinioBucket.BeatLeaderReplays, score.cachedReplayId);
        score.cachedReplayId = undefined;
        await score.save();
      } catch (error) {
        console.error(`Failed to delete replay for ${score.cachedReplayId}`, error);
      }
    }
  }
}
