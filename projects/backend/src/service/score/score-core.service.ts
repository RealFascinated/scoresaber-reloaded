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

    await ScoreCoreService.trackRealmPp(score);

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
   * Stores the score's pp in every non-default realm where its leaderboard is ranked. ScoreSaber's
   * websocket and v1 APIs only carry the default realm's pp, so the other realms are computed from
   * the realm's stars and pp curve (and later corrected by the realm score sync).
   *
   * @param score the score that was just stored
   */
  private static async trackRealmPp(score: ScoreSaberScore): Promise<void> {
    try {
      const realmIds = (await RealmService.getRealmIds()).filter(id => id !== DEFAULT_REALM_ID);
      await Promise.all(
        realmIds.map(async realmId => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(
            score.leaderboardId,
            realmId
          );
          if (!leaderboard.ranked) {
            return;
          }
          const curve = await RealmService.getCalculationCurve(realmId);
          const pp = ScoreSaberCurve.getPp(leaderboard.stars, score.accuracy, curve);
          await ScoreSaberScoresRepository.setRealmPpForExistingScores(realmId, [
            { scoreId: score.scoreId, pp },
          ]);
        })
      );
    } catch (error) {
      ScoreCoreService.logger.warn(`Failed to track realm pp for score "${score.scoreId}":`, error);
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
    try {
      const seenScoreIds = new Set<number>();
      const seenPlayerLeaderboards = new Set<string>();
      for (const score of scores) {
        const row = ScoreCoreService.toInsertRow(score);
        const playerLeaderboardKey = `${row.playerId}:${row.leaderboardId}`;
        if (seenScoreIds.has(row.scoreId) || seenPlayerLeaderboards.has(playerLeaderboardKey)) {
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
