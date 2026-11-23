import { BadGatewayError } from "@ssr/common/error/bad-gateway-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import type { BeatLeaderPlayerLookupToken } from "@ssr/common/schemas/beatleader/tokens/players/player";
import { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { BeatLeaderScoreImprovementToken } from "@ssr/common/schemas/beatleader/tokens/score/score-improvement";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { beatLeaderTimesetToMs, getBeatLeaderReplayId } from "@ssr/common/utils/beatleader-utils";
import Request from "@ssr/common/utils/request";
import { formatDuration, TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { BatchLoader } from "../../common/batch-loader";
import { createGenericEmbed } from "../../common/discord/embed";
import { beatLeaderScoreRowToType } from "../../db/converter/beatleader-score";
import { scoreSaberAccountRowToType } from "../../db/converter/scoresaber-account";
import { BeatLeaderPlayersRepository } from "../../repositories/beatleader-players.repository";
import {
  type BeatLeaderScoreInsert,
  type BeatLeaderSongScoreLookup,
  BeatLeaderScoresRepository,
} from "../../repositories/beatleader-scores.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { BeatLeaderApiService } from "../external/beatleader-api.service";
import StorageService from "../infra/storage.service";
import { PlayerCoreService } from "../player/player-core.service";

export default class BeatLeaderService {
  private static readonly logger: ScopedLogger = Logger.withTopic("BeatLeader");

  private static readonly latestBySongLoader = new BatchLoader<
    BeatLeaderSongScoreLookup,
    Awaited<ReturnType<typeof BeatLeaderScoresRepository.findLatestBySong>> | undefined
  >(lookups => BeatLeaderScoresRepository.findLatestBySongs(lookups));

  /**
   * Tracks BeatLeader score.
   *
   * @param scoreToken the BeatLeader API score payload
   * @param isTop50GlobalScore whether the score is a top 50 global score
   * @param log whether to log the tracked score
   * @param accountId the SSR account the score should be attributed to. When omitted,
   *   the score is attributed to the account matching the score's player ID.
   * @returns the BeatLeader score, or undefined if none
   */
  public static async trackBeatLeaderScore(
    scoreToken: BeatLeaderScoreToken,
    isTop50GlobalScore: boolean = false,
    log: boolean = true,
    accountId?: string
  ) {
    const before = performance.now();
    const account = await BeatLeaderService.resolveScoreAccount(scoreToken, accountId);

    if (account == null) {
      return undefined;
    }

    const playerId = account.id;

    const existing = await BeatLeaderScoresRepository.findRowById(scoreToken.id);
    if (existing) {
      return beatLeaderScoreRowToType(existing);
    }

    const getMisses = (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) =>
      score.missedNotes + score.badCuts + score.bombCuts;

    const rawScoreImprovement = scoreToken.scoreImprovement;
    const improvement = BeatLeaderService.improvementRowFromToken(rawScoreImprovement, getMisses);

    const pendingBl = BeatLeaderService.beatLeaderScoreFromToken(scoreToken, false, getMisses, playerId);
    const savedReplay = await this.saveReplay(pendingBl, account, isTop50GlobalScore);

    const insertRow = BeatLeaderService.insertRowFromToken(
      scoreToken,
      playerId,
      savedReplay,
      improvement,
      getMisses
    );
    const row = await BeatLeaderScoresRepository.insertReturning(insertRow);
    if (!row) {
      const concurrent = await BeatLeaderScoresRepository.findRowById(scoreToken.id);
      if (!concurrent) {
        throw new Error(`BeatLeader score "${scoreToken.id}" could not be inserted`);
      }
      return beatLeaderScoreRowToType(concurrent);
    }

    void BeatLeaderService.saveScoreStats(scoreToken.id).catch(error => {
      BeatLeaderService.logger.error(`Failed to save score stats for "${scoreToken.id}": ${error}`);
    });

    const timeTaken = performance.now() - before;
    if (log) {
      BeatLeaderService.logger.info(
        `Tracked BeatLeader score "${scoreToken.id}" for "${account.name}"(${playerId}) in ${formatDuration(timeTaken)}`
      );
    }
    return beatLeaderScoreRowToType(row);
  }

  private static insertRowFromToken(
    scoreToken: BeatLeaderScoreToken,
    playerId: string,
    savedReplay: boolean,
    improvement: ReturnType<typeof BeatLeaderService.improvementRowFromToken>,
    getMisses: (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) => number
  ) {
    const leaderboard = scoreToken.leaderboard;
    const difficulty = leaderboard.difficulty;
    return {
      id: scoreToken.id,
      playerId,
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
      timestamp: new Date(Number(scoreToken.timeset) * 1000),
    };
  }

  /**
   * Tracks a page of BeatLeader scores for a known account with one lookup and one insert,
   * instead of a lookup, an insert and an account resolution per score. Scores that are already
   * stored are skipped; replays are still saved one at a time and score stats are saved in the background.
   *
   * @param scoreTokens the BeatLeader API score payloads
   * @param accountId the SSR account the scores are attributed to
   * @returns how many of the given scores were not stored before the call (0 if the account is not tracked)
   */
  public static async trackBeatLeaderScoresBatch(scoreTokens: BeatLeaderScoreToken[], accountId: string) {
    const account = await PlayerCoreService.getAccount(accountId);
    if (account == null || scoreTokens.length === 0) {
      return 0;
    }

    const getMisses = (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) =>
      score.missedNotes + score.badCuts + score.bombCuts;

    const existing = await BeatLeaderScoresRepository.findExistingIds(scoreTokens.map(token => token.id));
    const seen = new Set<number>();
    const rows: BeatLeaderScoreInsert[] = [];
    let missing = 0;
    for (const scoreToken of scoreTokens) {
      if (existing.has(scoreToken.id)) {
        continue;
      }
      missing++;
      if (seen.has(scoreToken.id)) {
        continue;
      }
      seen.add(scoreToken.id);

      const improvement = BeatLeaderService.improvementRowFromToken(scoreToken.scoreImprovement, getMisses);
      const pendingBl = BeatLeaderService.beatLeaderScoreFromToken(scoreToken, false, getMisses, account.id);
      const savedReplay = await BeatLeaderService.saveReplay(pendingBl, account, false);
      rows.push(
        BeatLeaderService.insertRowFromToken(scoreToken, account.id, savedReplay, improvement, getMisses)
      );
    }

    const insertedIds = await BeatLeaderScoresRepository.insertManyReturningIds(rows);
    for (const scoreId of insertedIds) {
      void BeatLeaderService.saveScoreStats(scoreId).catch(error => {
        BeatLeaderService.logger.error(`Failed to save score stats for "${scoreId}": ${error}`);
      });
    }
    return missing;
  }

  private static async resolveScoreAccount(scoreToken: BeatLeaderScoreToken, accountId?: string) {
    if (accountId) {
      return await PlayerCoreService.getAccount(accountId);
    }

    if ((await BeatLeaderPlayersRepository.findById(scoreToken.playerId)) != null) {
      return await BeatLeaderService.resolveAccountForBlPlayer(
        scoreToken.playerId,
        beatLeaderTimesetToMs(scoreToken.timeset)
      );
    }

    return await PlayerCoreService.getAccount(scoreToken.playerId);
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
  ) {
    const beatLeaderScore = await BeatLeaderService.latestBySongLoader.load({
      playerId,
      songHashUpper: songHash.toUpperCase(),
      songDifficulty: songDifficulty as MapDifficulty,
      songCharacteristic: songCharacteristic as MapCharacteristic,
      songScore,
    });
    return beatLeaderScore ? beatLeaderScoreRowToType(beatLeaderScore) : undefined;
  }

  /**
   * Gets the BeatLeader score for a player's score.
   *
   * @param scoreId the id of the score
   * @returns the BeatLeader score, or undefined if none
   */
  public static async getBeatLeaderScore(scoreId: number) {
    const beatLeaderScore = await BeatLeaderScoresRepository.findRowById(scoreId);
    return beatLeaderScore ? beatLeaderScoreRowToType(beatLeaderScore) : undefined;
  }

  /**
   * Gets the score stats for a score id.
   *
   * @param scoreId the id of the score
   */
  public static async getScoreStats(scoreId: number) {
    const scoreStatsFile = await StorageService.getFile(
      StorageBucket.BeatLeaderScoreStats,
      `${scoreId}.json`
    );
    if (scoreStatsFile != undefined) {
      return JSON.parse(scoreStatsFile.toString()) as ScoreStatsToken;
    }
    if (await BeatLeaderScoresRepository.findRowById(scoreId)) {
      return this.saveScoreStats(scoreId);
    }
    const result = await BeatLeaderApiService.lookupScoreStats(scoreId);
    if (result.ok) {
      return result.response;
    }
    if (result.error === "not_found") {
      return undefined;
    }
    throw new BadGatewayError(
      `Failed to fetch BeatLeader score stats for score ${scoreId}: ${result.message}`
    );
  }

  /**
   * Saves the score stats for a score id.
   *
   * @param scoreId the id of the score
   * @returns the score stats, or undefined if nothing was found
   */
  public static async saveScoreStats(scoreId: number) {
    const result = await BeatLeaderApiService.lookupScoreStats(scoreId);
    if (!result.ok) {
      if (result.error === "not_found") {
        return undefined;
      }
      throw new BadGatewayError(
        `Failed to fetch BeatLeader score stats for score ${scoreId}: ${result.message}`
      );
    }
    await StorageService.saveFile(
      StorageBucket.BeatLeaderScoreStats,
      `${scoreId}.json`,
      Buffer.from(JSON.stringify(result.response))
    );
    return result.response;
  }

  /**
   * Gets the player's full score stats for a map.
   *
   * @param scoreId the score id to get the full score stats for
   * @returns the score stats
   * @throws NotFoundError if the score stats are not found
   */
  public static async getScoresFullScoreStats(scoreId: number) {
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

    const previousScoreId = await BeatLeaderScoresRepository.findPreviousIdBeforeTimestamp(
      current.playerId,
      current.songHash.toUpperCase(),
      current.leaderboardId,
      current.timestamp
    );

    const [currentStats, previousStats] = await Promise.all([
      this.getScoreStats(current.scoreId),
      previousScoreId ? this.getScoreStats(previousScoreId) : undefined,
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

        if (replay.ok) {
          return await StorageService.saveFile(
            StorageBucket.BeatLeaderReplays,
            `${replayId}`,
            Buffer.from(replay.response)
          );
        }
        if (replay.error !== "not_found") {
          throw new Error(`Unable to fetch replay for ${beatLeaderScore.scoreId}: ${replay.message}`);
        }
      } catch (error) {
        sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
          createGenericEmbed(
            "BeatLeader Replays",
            `Failed to save replay for ${beatLeaderScore.scoreId}: ${error}`
          )
        );
        BeatLeaderService.logger.error(`Failed to save replay for ${beatLeaderScore.scoreId}: ${error}`);
      }
    }
    return false;
  }

  private static readonly BEATLEADER_PLAYER_TTL_MS = TimeUnit.toMillis(TimeUnit.Day, 1);

  /**
   * Gets a BeatLeader player's mapping from the cache, refreshing it from the API
   * when it is missing or stale. Falls back to the stale entry when the refresh fails.
   *
   * @param blPlayerId the canonical BeatLeader player ID
   * @returns the player mapping, or undefined if unknown
   */
  public static async getBeatLeaderPlayer(blPlayerId: string) {
    const cached = await BeatLeaderPlayersRepository.findById(blPlayerId);
    if (cached && Date.now() - cached.lastFetched.getTime() < BeatLeaderService.BEATLEADER_PLAYER_TTL_MS) {
      return cached;
    }

    const result = await BeatLeaderApiService.lookupPlayer(blPlayerId);
    if (result.ok) {
      return BeatLeaderPlayersRepository.upsert(BeatLeaderService.playerRowFromToken(result.response));
    }
    if (result.error !== "not_found") {
      BeatLeaderService.logger.warn(
        `Failed to refresh BeatLeader player "${blPlayerId}", using the cached mapping: ${result.message}`
      );
    }
    return cached;
  }

  /**
   * Fetches and caches the BeatLeader player mapping for an SSR account. BeatLeader's
   * API resolves any linked ID (Steam, Oculus PC, Quest, ...) to the canonical player,
   * so this works with ScoreSaber account IDs too.
   *
   * @param playerId any ID the player is known by
   * @returns the cached player mapping, or undefined if the player is not on BeatLeader
   */
  public static async upsertBeatLeaderPlayer(playerId: string) {
    const result = await BeatLeaderApiService.lookupPlayer(playerId);
    if (!result.ok) {
      if (result.error === "not_found") {
        return undefined;
      }
      throw new BadGatewayError(`Failed to look up BeatLeader player "${playerId}": ${result.message}`);
    }
    return BeatLeaderPlayersRepository.upsert(BeatLeaderService.playerRowFromToken(result.response));
  }

  /**
   * Fetches a BeatLeader player's mapping and persists it only when the player
   * is linked to a tracked SSR account.
   *
   * Fallback for the real-time path when the mapping cache has not been seeded
   * yet (the BeatLeader player ID differs from the ScoreSaber account ID).
   * Mappings for untracked players are never persisted, so the table does not
   * grow with the whole BeatLeader population.
   *
   * @param blPlayerId the canonical BeatLeader player ID
   * @returns the persisted mapping when the player is tracked, or undefined
   */
  public static async fetchMappingIfTracked(blPlayerId: string) {
    const result = await BeatLeaderApiService.lookupPlayer(blPlayerId);
    if (!result.ok) {
      if (result.error === "not_found") {
        return undefined;
      }
      throw new BadGatewayError(`Failed to look up BeatLeader player "${blPlayerId}": ${result.message}`);
    }
    const token = result.response;
    const linkedIds = [
      token.id,
      ...(token.linkedIds
        ? [token.linkedIds.steamId, token.linkedIds.oculusPCId, token.linkedIds.questId]
        : []),
    ]
      .filter((id): id is string | number => id != null && id.toString().length > 0)
      .map(id => id.toString());
    if (linkedIds.length === 0) {
      return undefined;
    }

    const accounts = await ScoreSaberAccountsRepository.findManyByIds([...new Set(linkedIds)]);
    if (accounts.length === 0) {
      return undefined;
    }
    return BeatLeaderPlayersRepository.upsert(BeatLeaderService.playerRowFromToken(token));
  }

  /**
   * Whether a BeatLeader player and a ScoreSaber account are the same human, based on
   * the player's cached linked account IDs. Uses only cached data (never fetches), so
   * pairing stays cheap; players without a cached entry only pair on identical IDs.
   *
   * @param blPlayerId the canonical BeatLeader player ID
   * @param ssAccountId the ScoreSaber account ID
   * @returns whether they are the same player
   */
  public static async isSamePlayer(blPlayerId: string, ssAccountId: string) {
    if (blPlayerId === ssAccountId) {
      return true;
    }
    const player = await BeatLeaderPlayersRepository.findById(blPlayerId);
    return (
      player != null &&
      (ssAccountId === player.steamId || ssAccountId === player.oculusPCId || ssAccountId === player.questId)
    );
  }

  /**
   * Resolves the SSR account that owns a BeatLeader player, using the player's linked
   * account IDs. When multiple accounts match (e.g. an old alt and the current main),
   * the account that actually played around the given time is preferred, falling back
   * to the most recently active account.
   *
   * @param blPlayerId the canonical BeatLeader player ID
   * @param timesetMs the play time of the score being attributed (unix milliseconds)
   * @returns the resolved SSR account, or undefined
   */
  public static async resolveAccountForBlPlayer(blPlayerId: string, timesetMs?: number) {
    const player = await BeatLeaderService.getBeatLeaderPlayer(blPlayerId);
    if (!player) {
      return undefined;
    }

    const linkedIds = [blPlayerId, player.steamId, player.oculusPCId, player.questId].filter(
      (id): id is string => id != null && id.length > 0
    );
    let candidates = await ScoreSaberAccountsRepository.findManyByIds([...new Set(linkedIds)]);
    if (candidates.length === 0) {
      return undefined;
    }

    if (candidates.length > 1 && timesetMs != null) {
      const windowMs = TimeUnit.toMillis(TimeUnit.Minute, 5);
      const played = await ScoreSaberScoresRepository.findPlayerIdsInTimeRange(
        candidates.map(candidate => candidate.id),
        new Date(timesetMs - windowMs),
        new Date(timesetMs + windowMs)
      );
      const playedAccounts = candidates.filter(candidate => played.includes(candidate.id));
      if (playedAccounts.length > 0) {
        candidates = playedAccounts;
      }
    }

    candidates.sort((a, b) => String(b.lastPlayedDate ?? "").localeCompare(String(a.lastPlayedDate ?? "")));
    return scoreSaberAccountRowToType(candidates[0]);
  }

  private static playerRowFromToken(token: BeatLeaderPlayerLookupToken) {
    const linked = token.linkedIds;
    const toId = (id: string | number | null | undefined) =>
      id == null || id.toString().length === 0 ? null : id.toString();
    return {
      id: token.id,
      name: token.name,
      platform: token.platform,
      steamId: toId(linked?.steamId),
      oculusPCId: toId(linked?.oculusPCId),
      questId: toId(linked?.questId),
      lastFetched: new Date(),
    };
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
    getMisses: (score: BeatLeaderScoreToken | BeatLeaderScoreImprovementToken) => number,
    playerId: string
  ) {
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
      playerId,
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
