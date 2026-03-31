import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { BeatLeaderScoreImprovementToken } from "@ssr/common/schemas/beatleader/tokens/score/score-improvement";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { getBeatLeaderReplayId } from "@ssr/common/utils/beatleader-utils";
import Request from "@ssr/common/utils/request";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { DiscordChannels, sendEmbedToChannel } from "../bot/bot";
import { createGenericEmbed } from "../common/discord/embed";
import { db } from "../db";
import { beatLeaderScoreRowToType } from "../db/converter/beatleader-score";
import { beatLeaderScoresTable } from "../db/schema";
import CacheService, { CacheId } from "./cache.service";
import { PlayerCoreService } from "./player/player-core.service";
import StorageService from "./storage.service";

export default class BeatLeaderService {
  /**
   * Tracks BeatLeader score.
   *
   * @param scoreToken the BeatLeader API score payload
   * @param isTop50GlobalScore whether the score is a top 50 global score
   * @returns the BeatLeader score, or undefined if none
   */
  public static async trackBeatLeaderScore(
    scoreToken: BeatLeaderScoreToken,
    isTop50GlobalScore: boolean = false,
    log: boolean = true
  ): Promise<BeatLeaderScore | undefined> {
    const before = performance.now();
    const { playerId } = scoreToken;
    const account = await PlayerCoreService.getAccount(playerId);

    // Only track for players that are being tracked
    if (account == null) {
      return undefined;
    }

    const existing = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.id, scoreToken.id))
      .limit(1);
    if (existing.length > 0) {
      return beatLeaderScoreRowToType(existing[0]);
    }

    const getMisses = (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) =>
      score.missedNotes + score.badCuts + score.bombCuts;

    const leaderboard = scoreToken.leaderboard;
    const difficulty = leaderboard.difficulty;
    const rawScoreImprovement = scoreToken.scoreImprovement;
    const improvement = BeatLeaderService.improvementRowFromToken(rawScoreImprovement, getMisses);

    const pendingBl = BeatLeaderService.beatLeaderScoreFromToken(scoreToken, false, getMisses);
    const savedReplay = await this.saveReplay(pendingBl, account, isTop50GlobalScore);

    const timestamp = new Date(Number(scoreToken.timeset) * 1000);
    const [row] = await db
      .insert(beatLeaderScoresTable)
      .values({
        id: scoreToken.id,
        playerId: scoreToken.playerId,
        songHash: leaderboard.song.hash.toUpperCase(),
        leaderboardId: leaderboard.id,
        songDifficulty: difficulty.difficultyName as MapDifficulty,
        songCharacteristic: difficulty.modeName as MapCharacteristic,
        songScore: scoreToken.baseScore,
        pauses: scoreToken.pauses,
        fcAccuracy: scoreToken.fcAccuracy * 100,
        fullCombo: scoreToken.fullCombo,
        savedReplay,
        leftHandAccuracy: scoreToken.accLeft,
        rightHandAccuracy: scoreToken.accRight,
        misses: getMisses(scoreToken),
        missedNotes: scoreToken.missedNotes,
        bombCuts: scoreToken.bombCuts,
        wallsHit: scoreToken.wallsHit,
        badCuts: scoreToken.badCuts,
        ...improvement,
        timestamp,
      })
      .returning();

    const timeTaken = performance.now() - before;
    if (log) {
      Logger.info(
        `Tracked BeatLeader score "${scoreToken.id}" for "${account.name}"(${playerId}) in ${formatDuration(timeTaken)}`
      );
    }
    return beatLeaderScoreRowToType(row);
  }

  /**
   * Gets the BeatLeader score for a player's score.
   *
   * @param playerId the id of the player
   * @param songHash the hash of the map
   * @param songDifficulty the difficulty of the map
   * @param songCharacteristic the characteristic of the map
   * @param songScore the score of the play
   * @returns the BeatLeader score, or undefined if none
   */
  public static async getBeatLeaderScoreFromSong(
    playerId: string,
    songHash: string,
    songDifficulty: string,
    songCharacteristic: string,
    songScore: number
  ): Promise<BeatLeaderScore | undefined> {
    return CacheService.fetch(
      CacheId.BeatLeaderScore,
      `beatleader-score:${playerId}-${songHash}-${songDifficulty}-${songScore}`,
      async () => {
        const beatLeaderScore = await db
          .select()
          .from(beatLeaderScoresTable)
          .where(
            and(
              eq(beatLeaderScoresTable.playerId, playerId),
              eq(beatLeaderScoresTable.songHash, songHash.toUpperCase()),
              eq(beatLeaderScoresTable.songDifficulty, songDifficulty as MapDifficulty),
              eq(beatLeaderScoresTable.songCharacteristic, songCharacteristic as MapCharacteristic),
              eq(beatLeaderScoresTable.songScore, songScore)
            )
          )
          .orderBy(desc(beatLeaderScoresTable.timestamp))
          .limit(1);
        if (beatLeaderScore.length === 0) {
          return undefined;
        }
        return beatLeaderScoreRowToType(beatLeaderScore[0]);
      }
    );
  }

  /**
   * Gets the BeatLeader score for a player's score.
   *
   * @param scoreId the id of the score
   * @returns the BeatLeader score, or undefined if none
   */
  public static async getBeatLeaderScore(scoreId: number): Promise<BeatLeaderScore | undefined> {
    return CacheService.fetch(CacheId.BeatLeaderScore, `beatleader-score:${scoreId}`, async () => {
      const beatLeaderScore = await db
        .select()
        .from(beatLeaderScoresTable)
        .where(eq(beatLeaderScoresTable.id, scoreId))
        .orderBy(desc(beatLeaderScoresTable.timestamp))
        .limit(1);
      if (!beatLeaderScore) {
        return undefined;
      }
      return beatLeaderScoreRowToType(beatLeaderScore[0]);
    });
  }

  /**
   * Checks whether a BeatLeader score has already been tracked.
   *
   * Used by the BeatLeader missing-scores seeding flow to avoid wasting pages.
   */
  public static async scoreExists(scoreId: number): Promise<boolean> {
    const row = await db
      .select({ id: beatLeaderScoresTable.id })
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.id, scoreId))
      .limit(1);
    return row.length > 0;
  }

  /**
   * Batch existence check for BeatLeader score ids.
   *
   * @returns a set containing all scoreIds that already exist
   */
  public static async scoresExist(scoreIds: ReadonlyArray<number>): Promise<Set<number>> {
    const unique = Array.from(new Set(scoreIds));
    if (unique.length === 0) {
      return new Set();
    }

    const rows = await db
      .select({ id: beatLeaderScoresTable.id })
      .from(beatLeaderScoresTable)
      .where(inArray(beatLeaderScoresTable.id, unique));
    return new Set(rows.map(r => r.id));
  }

  /**
   * Gets the score stats for a score id.
   *
   * @param scoreId the id of the score
   */
  public static async getScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    const scoreStatsFile = await StorageService.getFile(
      StorageBucket.BeatLeaderScoreStats,
      `${scoreId}.json`
    );
    if (scoreStatsFile != undefined) {
      return JSON.parse(scoreStatsFile.toString()) as ScoreStatsToken;
    }

    return this.saveScoreStats(scoreId);
  }

  /**
   * Saves the score stats for a score id.
   *
   * @param scoreId the id of the score
   * @returns the score stats, or undefined if nothing was found
   */
  public static async saveScoreStats(scoreId: number) {
    const scoreStats = await ApiServiceRegistry.getInstance()
      .getBeatLeaderService()
      .lookupScoreStats(scoreId);
    if (scoreStats == undefined) {
      return undefined;
    }
    await StorageService.saveFile(
      StorageBucket.BeatLeaderScoreStats,
      `${scoreId}.json`,
      Buffer.from(JSON.stringify(scoreStats))
    );
    return scoreStats;
  }

  /**
   * Gets the player's full score stats for a map.
   *
   * @param scoreId the score id to get the full score stats for
   * @returns the score stats
   * @throws NotFoundError if the score stats are not found
   */
  public static async getScoresFullScoreStats(scoreId: number): Promise<ScoreStatsResponse> {
    const current = await this.getBeatLeaderScore(scoreId);
    if (current == undefined) {
      const currentStats = await this.getScoreStats(scoreId);
      if (!currentStats) {
        throw new NotFoundError(`Score stats not found for score ${scoreId}`);
      }
      return {
        current: currentStats,
        previous: undefined,
      };
    }

    const previous = await this.getPreviousBeatLeaderScore(
      current.playerId,
      current.songHash,
      current.leaderboardId,
      current.timestamp
    );

    const [currentStats, previousStats] = await Promise.all([
      this.getScoreStats(current.scoreId),
      previous ? this.getScoreStats(previous.scoreId) : undefined,
    ]);
    if (!currentStats) {
      throw new NotFoundError(`Score stats not found for score ${scoreId}`);
    }

    return {
      current: currentStats,
      previous: previousStats,
    };
  }

  /**
   * Gets the player's previous BeatLeader score for a map.
   *
   * @param playerId the player's id to get the previous BeatLeader score for
   * @param songHash the hash of the map to get the previous BeatLeader score for
   * @param leaderboardId the leaderboard id to get the previous BeatLeader score for
   * @param timestamp the timestamp to get the previous BeatLeader score for
   * @returns the BeatLeader score, or undefined if none
   */
  public static async getPreviousBeatLeaderScore(
    playerId: string,
    songHash: string,
    leaderboardId: string,
    timestamp: Date
  ): Promise<BeatLeaderScore | undefined> {
    const beatLeaderScore = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(
        and(
          eq(beatLeaderScoresTable.playerId, playerId),
          eq(beatLeaderScoresTable.songHash, songHash.toUpperCase()),
          eq(beatLeaderScoresTable.leaderboardId, leaderboardId),
          lt(beatLeaderScoresTable.timestamp, timestamp)
        )
      )
      .orderBy(desc(beatLeaderScoresTable.timestamp))
      .limit(1);
    if (beatLeaderScore.length === 0) {
      return undefined;
    }
    return beatLeaderScoreRowToType(beatLeaderScore[0]);
  }

  /**
   * Saves a replay to the storage.
   *
   * @param beatLeaderScore the BeatLeader score to save the replay for
   * @param account the account to save the replay for
   * @param isTop50GlobalScore whether the score is a top 50 global score
   * @returns whether the replay was saved
   */
  public static async saveReplay(
    beatLeaderScore: BeatLeaderScore,
    account: ScoreSaberAccount,
    isTop50GlobalScore: boolean
  ) {
    if (isProduction() && account && (account.trackReplays || isTop50GlobalScore)) {
      try {
        const replayId = getBeatLeaderReplayId(beatLeaderScore);
        const replay = await Request.get<ArrayBuffer>(`https://cdn.replays.beatleader.xyz/${replayId}`, {
          returns: "arraybuffer",
        });

        if (replay !== undefined) {
          await StorageService.saveFile(StorageBucket.BeatLeaderReplays, `${replayId}`, Buffer.from(replay));
          return true;
        }
      } catch (error) {
        sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
          createGenericEmbed(
            "BeatLeader Replays",
            `Failed to save replay for ${beatLeaderScore.scoreId}: ${error}`
          )
        );
        Logger.error(`Failed to save replay for ${beatLeaderScore.scoreId}: ${error}`);
      }
    }
    return false;
  }

  private static improvementRowFromToken(
    raw: BeatLeaderScoreImprovementToken | null | undefined,
    getMisses: (score: BeatLeaderScoreImprovementToken) => number
  ) {
    if (raw == null || raw.score <= 0) {
      return {
        improvementScore: 0,
        improvementPauses: 0,
        improvementMisses: 0,
        improvementMissedNotes: 0,
        improvementBombCuts: 0,
        improvementWallsHit: 0,
        improvementBadCuts: 0,
        improvementLeftHandAccuracy: 0,
        improvementRightHandAccuracy: 0,
      };
    }
    return {
      improvementScore: raw.score,
      improvementPauses: raw.pauses,
      improvementMisses: getMisses(raw),
      improvementMissedNotes: raw.missedNotes,
      improvementBombCuts: raw.bombCuts,
      improvementWallsHit: raw.wallsHit,
      improvementBadCuts: raw.badCuts,
      improvementLeftHandAccuracy: raw.accLeft,
      improvementRightHandAccuracy: raw.accRight,
    };
  }

  private static beatLeaderScoreFromToken(
    scoreToken: BeatLeaderScoreToken,
    savedReplay: boolean,
    getMisses: (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) => number
  ): BeatLeaderScore {
    const rawScoreImprovement = scoreToken.scoreImprovement;
    const scoreImprovement =
      rawScoreImprovement && rawScoreImprovement.score > 0
        ? {
            score: rawScoreImprovement.score,
            pauses: rawScoreImprovement.pauses,
            misses: {
              misses: getMisses(rawScoreImprovement),
              missedNotes: rawScoreImprovement.missedNotes,
              bombCuts: rawScoreImprovement.bombCuts,
              badCuts: rawScoreImprovement.badCuts,
              wallsHit: rawScoreImprovement.wallsHit,
            },
            handAccuracy: {
              left: rawScoreImprovement.accLeft,
              right: rawScoreImprovement.accRight,
            },
          }
        : {
            score: 0,
            pauses: 0,
            misses: {
              misses: 0,
              missedNotes: 0,
              bombCuts: 0,
              wallsHit: 0,
              badCuts: 0,
            },
            handAccuracy: { left: 0, right: 0 },
          };

    return {
      playerId: scoreToken.playerId,
      songHash: scoreToken.leaderboard.song.hash.toUpperCase(),
      leaderboardId: scoreToken.leaderboard.id,
      scoreId: scoreToken.id,
      difficulty: scoreToken.leaderboard.difficulty.difficultyName as MapDifficulty,
      characteristic: scoreToken.leaderboard.difficulty.modeName as MapCharacteristic,
      pauses: scoreToken.pauses,
      fcAccuracy: scoreToken.fcAccuracy * 100,
      fullCombo: scoreToken.fullCombo,
      handAccuracy: {
        left: scoreToken.accLeft,
        right: scoreToken.accRight,
      },
      misses: {
        misses: getMisses(scoreToken),
        missedNotes: scoreToken.missedNotes,
        bombCuts: scoreToken.bombCuts,
        badCuts: scoreToken.badCuts,
        wallsHit: scoreToken.wallsHit,
      },
      scoreImprovement,
      savedReplay,
      timestamp: new Date(Number(scoreToken.timeset) * 1000),
    };
  }
}
