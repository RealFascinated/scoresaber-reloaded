import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { eq, inArray } from "drizzle-orm";
import { sendMedalScoreNotification } from "../../common/score/score.util";
import { db } from "../../db";
import type { ScoreSaberAccountRow, ScoreSaberScoreRow } from "../../db/schema";
import { scoreSaberAccountsTable } from "../../db/schema";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import {
  playerLeaderboardKey,
  ScoreSaberScoresRepository,
  type ScoreSaberScoreInsertRow,
} from "../../repositories/scoresaber-scores.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { PlayerMedalsService } from "../medals/player-medals.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import { RealmService } from "../realm/realm.service";

/** The account fields shown next to a score. */
export type ScorePlayerInfoRow = Pick<ScoreSaberAccountRow, "id" | "name" | "country" | "avatar">;

type InsertScoreDataOptions = {
  insertBeatLeaderScore?: boolean;
  insertPreviousScore?: boolean;
  insertPlayerInfo?: boolean;
  /**
   * Player info already loaded for the scores being enriched (see
   * {@link ScoreCoreService.getPlayerInfoByIds}). Callers enriching a page of scores pass it so the
   * page costs one account query instead of one per score. Players missing from it are looked up
   * individually.
   */
  playerInfoById?: ReadonlyMap<string, ScorePlayerInfoRow>;
};

export class ScoreCoreService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Score Core");

  /**
   * Tracks ScoreSaber score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard for the score
   * @param newScore whether the score was just set (live websocket)
   * @param beatLeaderScore optional BeatLeader replay link for Discord medal notifications
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    newScore: boolean = false,
    beatLeaderScore?: BeatLeaderScore,
    options?: {
      skipDuplicateCheck?: boolean;
    }
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
  }> {
    const before = performance.now();

    // A score already stored under this id (whatever its value) is a duplicate, so one primary key
    // lookup covers both the "same id and score" and the "same id" cases.
    // The two lookups are independent, so they share a round trip. The player's current row is
    // wasted work for a duplicate, which is the rarer case.
    const playerId = score.playerId;
    const [alreadyTracked, currentRow] = await Promise.all([
      ScoreSaberScoresRepository.rowExistsByScoreId(score.scoreId),
      ScoreSaberScoresRepository.findByPlayerAndLeaderboard(playerId, leaderboard.id, DEFAULT_REALM_ID),
    ]);
    if (alreadyTracked) {
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    let hasPreviousScore = false;
    const insertRow = ScoreCoreService.toInsertRow(score);

    if (currentRow && currentRow.scoreId !== score.scoreId) {
      hasPreviousScore = true;
      const shouldReplaceCurrent =
        newScore || ScoreCoreService.shouldIncomingReplaceCurrent(score, currentRow);

      if (shouldReplaceCurrent) {
        // Atomic replace: snapshots the previous PB to history and upserts the
        // new row in one transaction, with the newest play winning under
        // concurrent writes (see ScoreSaberScoresRepository.replaceScore).
        const inserted = await ScoreSaberScoresRepository.replaceScore(insertRow, DEFAULT_REALM_ID);
        if (!inserted) {
          return { score: undefined, hasPreviousScore, tracked: false };
        }
      } else {
        await ScoreSaberScoreHistoryRepository.insertAttempt(insertRow, playerId, leaderboard.id);
        return { score: undefined, hasPreviousScore: true, tracked: true };
      }
    } else {
      const inserted = await ScoreSaberScoresRepository.insertScore(insertRow, DEFAULT_REALM_ID);
      if (!inserted) {
        // Either a concurrent writer already recorded this scoreId (fine), or it
        // took the (playerId, leaderboardId) slot with a different score — keep
        // this play in history so it is not lost entirely.
        if (!(await ScoreSaberScoresRepository.rowExistsByScoreId(insertRow.scoreId))) {
          await ScoreSaberScoreHistoryRepository.insertAttempt(insertRow, playerId, leaderboard.id);
        }
        return { score: undefined, hasPreviousScore, tracked: false };
      }
    }

    await ScoreCoreService.trackRealmPp([score]);

    if (newScore) {
      await PlayerCoreService.updatePlayer(playerId, { hmd: score.hmd });
    }

    if (newScore && leaderboard.ranked && score.rank <= 10) {
      const medalChanges = await PlayerMedalsService.refreshLeaderboardMedals(leaderboard);
      if (medalChanges.size > 0) {
        await sendMedalScoreNotification(score, leaderboard, beatLeaderScore, medalChanges);
      }
    }

    if (newScore) {
      ScoreCoreService.logger.info(
        `Tracked ScoreSaber score "%s" for "%s" on "%s" [%s / %s]%s in %s`,
        score.scoreId,
        score.playerInfo?.name ?? playerId,
        leaderboard.songName,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        hasPreviousScore ? ` (improvement)` : "",
        formatDuration(performance.now() - before)
      );
    }
    return { score: score, hasPreviousScore, tracked: true };
  }

  /**
   * Tracks many ScoreSaber scores of one ingest page (not live scores: `newScore` is false and there is no
   * BeatLeader score) and returns the same results as calling {@link trackScoreSaberScore} on each of them.
   *
   * The common case, a score that isn't stored yet for a player with no current score on that leaderboard, is
   * stored with a few queries for the whole page. Everything else (the player already has a score there, or
   * the page repeats a score id or player/leaderboard pair) goes through {@link trackScoreSaberScore} one
   * by one, in page order, so replace-PB and history behaviour is unchanged.
   *
   * The scores' players must already exist.
   *
   * @param entries the scores and their leaderboards
   * @returns one result per entry, in the same order
   */
  public static async trackScoreSaberScoresBatch(
    entries: { score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard }[]
  ): Promise<Awaited<ReturnType<typeof ScoreCoreService.trackScoreSaberScore>>[]> {
    type TrackResult = Awaited<ReturnType<typeof ScoreCoreService.trackScoreSaberScore>>;
    const results: TrackResult[] = new Array(entries.length);
    if (entries.length === 0) {
      return results;
    }

    const [existingScoreIds, occupiedSlots] = await Promise.all([
      ScoreSaberScoresRepository.findExistingScoreIds(entries.map(entry => entry.score.scoreId)),
      ScoreSaberScoresRepository.findExistingPlayerLeaderboardKeys(
        entries.map(entry => ({ playerId: entry.score.playerId, leaderboardId: entry.leaderboard.id }))
      ),
    ]);

    // A score id or player/leaderboard slot that appears more than once in the page can't be decided
    // from the state read above, so every occurrence is handled one at a time.
    const scoreIdCounts = new Map<number, number>();
    const slotCounts = new Map<string, number>();
    for (const { score, leaderboard } of entries) {
      scoreIdCounts.set(score.scoreId, (scoreIdCounts.get(score.scoreId) ?? 0) + 1);
      const slot = playerLeaderboardKey(score.playerId, leaderboard.id);
      slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
    }

    const fresh: number[] = [];
    const fallback: number[] = [];
    entries.forEach(({ score, leaderboard }, index) => {
      const slot = playerLeaderboardKey(score.playerId, leaderboard.id);
      if (existingScoreIds.has(score.scoreId)) {
        // Already stored: a duplicate, same as the check at the start of trackScoreSaberScore
        results[index] = { score: undefined, hasPreviousScore: false, tracked: false };
      } else if (
        occupiedSlots.has(slot) ||
        (scoreIdCounts.get(score.scoreId) ?? 0) > 1 ||
        (slotCounts.get(slot) ?? 0) > 1
      ) {
        fallback.push(index);
      } else {
        fresh.push(index);
      }
    });

    const insertedScores: ScoreSaberScore[] = [];
    if (fresh.length > 0) {
      const rows = fresh.map(index => ScoreCoreService.toInsertRow(entries[index].score));
      const insertedIds = await ScoreSaberScoresRepository.insertScores(rows, DEFAULT_REALM_ID);

      await Promise.all(
        fresh.map(async (entryIndex, freshIndex) => {
          const { score, leaderboard } = entries[entryIndex];
          if (insertedIds.has(score.scoreId)) {
            insertedScores.push(score);
            results[entryIndex] = { score, hasPreviousScore: false, tracked: true };
            return;
          }
          // Either a concurrent writer already recorded this scoreId (fine), or it took the
          // (playerId, leaderboardId) slot with a different score: keep this play in history so it
          // is not lost entirely.
          if (!(await ScoreSaberScoresRepository.rowExistsByScoreId(score.scoreId))) {
            await ScoreSaberScoreHistoryRepository.insertAttempt(
              rows[freshIndex],
              score.playerId,
              leaderboard.id
            );
          }
          results[entryIndex] = { score: undefined, hasPreviousScore: false, tracked: false };
        })
      );

      await ScoreCoreService.trackRealmPp(insertedScores);
    }

    for (const index of fallback) {
      const { score, leaderboard } = entries[index];
      results[index] = await ScoreCoreService.trackScoreSaberScore(score, leaderboard, false);
    }

    return results;
  }

  /**
   * Stores the score's pp in every non-default realm where its leaderboard is ranked. ScoreSaber's
   * websocket and v1 APIs only carry the default realm's pp, so the other realms are computed from
   * the realm's stars and pp curve (and later corrected by the realm score sync).
   *
   * @param score the score that was just stored
   */
  private static async trackRealmPp(scores: ScoreSaberScore[]): Promise<void> {
    if (scores.length === 0) {
      return;
    }

    try {
      const realmIds = (await RealmService.getRealmIds()).filter(id => id !== DEFAULT_REALM_ID);
      const leaderboardIds = [...new Set(scores.map(score => score.leaderboardId))];
      await Promise.all(
        realmIds.map(async realmId => {
          // The realm's leaderboards and curve are the same for every score of the same leaderboard, so
          // they are loaded once per realm instead of once per score
          const leaderboards = new Map(
            await Promise.all(
              leaderboardIds.map(
                async leaderboardId =>
                  [
                    leaderboardId,
                    await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId),
                  ] as const
              )
            )
          );
          const rankedScores = scores.filter(score => leaderboards.get(score.leaderboardId)?.ranked);
          if (rankedScores.length === 0) {
            return;
          }
          const curve = await RealmService.getCalculationCurve(realmId);
          await ScoreSaberScoresRepository.setRealmPpForExistingScores(
            realmId,
            rankedScores.map(score => ({
              scoreId: score.scoreId,
              pp: ScoreSaberCurve.getPp(leaderboards.get(score.leaderboardId)!.stars, score.accuracy, curve),
            }))
          );
        })
      );
    } catch (error) {
      ScoreCoreService.logger.warn(
        `Failed to track realm pp for score(s) ${scores.map(score => `"${score.scoreId}"`).join(", ")}:`,
        error
      );
    }
  }

  /**
   * Whether an ingested score should replace the stored current PB (sync/backfill paths).
   */
  private static shouldIncomingReplaceCurrent(
    incoming: ScoreSaberScore,
    current: ScoreSaberScoreRow
  ): boolean {
    if (incoming.timestamp.getTime() > current.timestamp.getTime()) {
      return true;
    }
    if (incoming.timestamp.getTime() < current.timestamp.getTime()) {
      return false;
    }
    if (incoming.score > current.score) {
      return true;
    }
    if (incoming.score < current.score) {
      return false;
    }
    return incoming.pp > current.pp;
  }

  public static toInsertRow(score: ScoreSaberScore): ScoreSaberScoreInsertRow {
    const modifiers = score.modifiers.map(modifier => modifier.toString());
    return {
      scoreId: score.scoreId,
      playerId: score.playerId,
      leaderboardId: score.leaderboardId,
      difficulty: score.difficulty,
      characteristic: score.characteristic,
      score: score.score,
      accuracy: score.accuracy,
      pp: score.pp,
      medals: 0,
      missedNotes: score.missedNotes,
      badCuts: score.badCuts,
      maxCombo: score.maxCombo,
      fullCombo: score.fullCombo,
      modifiers: modifiers.length > 0 ? modifiers : null,
      hmd: score.hmd,
      rightController: score.rightController,
      leftController: score.leftController,
      timestamp: score.timestamp,
    };
  }

  /** Scores persisted from the API recently, by `scoreId:score`, so repeated page views skip the write. */
  private static readonly recentlyUpserted = new Map<string, number>();
  private static readonly UPSERT_DEDUPE_MS = 10 * 60 * 1000;
  private static readonly UPSERT_DEDUPE_MAX = 50_000;

  private static markUpserted(rows: ScoreSaberScoreInsertRow[], now: number): void {
    const recentlyUpserted = ScoreCoreService.recentlyUpserted;
    for (const row of rows) {
      const key = `${row.scoreId}:${row.score}`;
      // Delete first so a refreshed key moves to the end of the Map's insertion order.
      recentlyUpserted.delete(key);
      recentlyUpserted.set(key, now);
    }
    // Evict the oldest entries (Map iterates in insertion order) instead of rescanning the whole map.
    while (recentlyUpserted.size > ScoreCoreService.UPSERT_DEDUPE_MAX) {
      const oldest = recentlyUpserted.keys().next();
      if (oldest.done) {
        break;
      }
      recentlyUpserted.delete(oldest.value);
    }
  }

  /**
   * Upserts scores fetched from the ScoreSaber API into the database.
   *
   * Fire-and-forget safe: this never throws, so callers can invoke it without
   * awaiting (e.g. `void ScoreCoreService.upsertScoresFromApi(scores)`) without
   * blocking the API response. New scores are inserted; scores that already exist
   * (same scoreId) only have their `pp` refreshed when it differs. If the bulk
   * upsert hits a row that violates the per-player-per-leaderboard unique
   * constraint (an older attempt on a map the player already has a current row
   * for), it falls back to upserting each score individually so a single stale
   * score cannot block the rest.
   *
   * @param scores the scores to upsert
   */
  public static async upsertScoresFromApi(scores: ScoreSaberScore[]): Promise<void> {
    const insertRows: ScoreSaberScoreInsertRow[] = [];
    const now = Date.now();
    try {
      const seenScoreIds = new Set<number>();
      const seenPlayerLeaderboards = new Set<string>();
      for (const score of scores) {
        const row = ScoreCoreService.toInsertRow(score);
        const playerLeaderboardKey = `${row.playerId}:${row.leaderboardId}`;
        if (seenScoreIds.has(row.scoreId) || seenPlayerLeaderboards.has(playerLeaderboardKey)) {
          continue;
        }
        // The same API page is served again and again; skip scores already persisted moments ago.
        const persistedAt = ScoreCoreService.recentlyUpserted.get(`${row.scoreId}:${row.score}`);
        if (persistedAt !== undefined && now - persistedAt < ScoreCoreService.UPSERT_DEDUPE_MS) {
          continue;
        }
        seenScoreIds.add(row.scoreId);
        seenPlayerLeaderboards.add(playerLeaderboardKey);
        insertRows.push(row);
      }
    } catch (error) {
      ScoreCoreService.logger.warn(`Failed to prepare score upserts:`, error);
      return;
    }

    if (insertRows.length === 0) {
      return;
    }

    try {
      await ScoreSaberScoresRepository.upsertScores(insertRows, DEFAULT_REALM_ID);
      ScoreCoreService.markUpserted(insertRows, now);
    } catch (error) {
      ScoreCoreService.logger.debug(
        `Bulk score upsert for %d score(s) failed, retrying per score: %s`,
        insertRows.length,
        (error as Error).message
      );
      await Promise.allSettled(
        insertRows.map(row =>
          ScoreSaberScoresRepository.upsertScores([row], DEFAULT_REALM_ID).catch(error =>
            ScoreCoreService.logger.debug(
              `Failed to upsert score "%s" for player "%s": %s`,
              row.scoreId,
              row.playerId,
              (error as Error).message
            )
          )
        )
      );
    }
  }

  /**
   * Loads the player info of several players with a single query.
   *
   * @param playerIds the ids of the players, duplicates are fine
   * @returns the info of the players that exist, by player id
   */
  public static async getPlayerInfoByIds(
    playerIds: Iterable<string>
  ): Promise<Map<string, ScorePlayerInfoRow>> {
    const ids = [...new Set(playerIds)];
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await db
      .select({
        id: scoreSaberAccountsTable.id,
        name: scoreSaberAccountsTable.name,
        country: scoreSaberAccountsTable.country,
        avatar: scoreSaberAccountsTable.avatar,
      })
      .from(scoreSaberAccountsTable)
      .where(inArray(scoreSaberAccountsTable.id, ids));
    return new Map(rows.map(row => [row.id, row]));
  }

  /**
   * Inserts the score data into the score.
   *
   * @param score the score to insert data into
   * @param leaderboard the leaderboard to get the data from
   * @returns the score with the data inserted
   */
  public static async insertScoreData(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberScore>;
  public static async insertScoreData(
    score: ScoreSaberMedalScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberMedalScore>;
  public static async insertScoreData(
    score: ScoreSaberScore | ScoreSaberMedalScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberScore | ScoreSaberMedalScore> {
    options = {
      insertBeatLeaderScore: true,
      insertPreviousScore: true,
      insertPlayerInfo: true,
      ...options,
    };

    leaderboard = !leaderboard
      ? await ScoreSaberLeaderboardsService.getLeaderboard(score.leaderboardId, DEFAULT_REALM_ID)
      : leaderboard;

    if (!leaderboard) {
      return score;
    }

    async function getBeatLeaderScore() {
      if (options?.insertBeatLeaderScore === false) {
        return undefined;
      }
      return BeatLeaderService.getBeatLeaderScoreFromSong(
        score.playerId,
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        score.score
      );
    }

    async function getPreviousScore() {
      if (options?.insertPreviousScore && leaderboard) {
        return PlayerScoreHistoryService.getPlayerPreviousScore(score, leaderboard);
      }
      return undefined;
    }

    async function getPlayerInfo() {
      if (options?.insertPlayerInfo) {
        const preloaded = options.playerInfoById?.get(score.playerId);
        if (preloaded) {
          return preloaded;
        }
        const [row] = await db
          .select({
            id: scoreSaberAccountsTable.id,
            name: scoreSaberAccountsTable.name,
            country: scoreSaberAccountsTable.country,
            avatar: scoreSaberAccountsTable.avatar,
          })
          .from(scoreSaberAccountsTable)
          .where(eq(scoreSaberAccountsTable.id, score.playerId));

        return row;
      }
      return undefined;
    }

    const [beatLeaderScore, previousScore, playerInfo] = await Promise.all([
      getBeatLeaderScore(),
      getPreviousScore(),
      getPlayerInfo(),
    ]);

    if (beatLeaderScore !== undefined) {
      score.beatLeaderScore = beatLeaderScore;
    }

    if (previousScore !== undefined) {
      score.previousScore = previousScore;
    }

    if (playerInfo !== undefined) {
      score.playerInfo = {
        id: playerInfo.id,
        name: playerInfo.name,
        avatar: playerInfo.avatar,
        country: playerInfo.country ?? undefined,
      };
    }

    return score;
  }
}
