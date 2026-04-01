import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { MedalChange } from "@ssr/common/schemas/medals/medal-changes";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { isProduction } from "@ssr/common/utils/utils";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { sendMedalScoreNotification } from "../../common/score/score.util";
import { db } from "../../db";
import { scoreSaberMedalScoreRowToType, scoreSaberScoreToMedalScore } from "../../db/converter/medal-score";
import {
  ScoreSaberMedalScoreRow,
  scoreSaberAccountsTable,
  scoreSaberMedalScoresTable,
} from "../../db/schema";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { PlayerMedalsService } from "../player/player-medals.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";

type MedalScoresQueueItem = {
  score: ScoreSaberScore;
  beatLeaderScore: BeatLeaderScore | undefined;
};

/** ScoreSaber top-10 order; used when diffing against the API. Display rank uses medals → timestamp in {@link MedalScoresService.getMedalTableScoreRanksForScores}. */
function sortMedalRowsByLeaderboardOrder(rows: ScoreSaberMedalScoreRow[]): ScoreSaberMedalScoreRow[] {
  return [...rows].sort((a, b) => b.score - a.score || b.scoreId - a.scoreId);
}

function medalScoreInsert(
  score: ScoreSaberScore | ScoreSaberMedalScore
): typeof scoreSaberMedalScoresTable.$inferInsert {
  const modifiers = score.modifiers.map(modifier => modifier.toString());

  const medals =
    "medals" in score && typeof score.medals === "number"
      ? score.medals
      : MEDAL_COUNTS[score.rank as keyof typeof MEDAL_COUNTS];

  return {
    scoreId: score.scoreId,
    playerId: score.playerId,
    leaderboardId: score.leaderboardId,
    difficulty: score.difficulty,
    characteristic: score.characteristic,
    score: score.score,
    accuracy: score.accuracy,
    medals,
    missedNotes: score.missedNotes,
    badCuts: score.badCuts,
    maxCombo: score.maxCombo,
    fullCombo: score.fullCombo,
    modifiers: modifiers.length > 0 ? modifiers : null,
    hmd: score.hmd ?? "Unknown",
    rightController: score.rightController,
    leftController: score.leftController,
    timestamp: score.timestamp,
  };
}

export class MedalScoresService {
  private static IGNORE_SCORES = false;
  private static SCORES_INGEST_QUEUE = new Map<number, MedalScoresQueueItem>();

  /**
   * 1-based rank on each score's leaderboard in `scoresaber-medal-scores`
   * (medals desc, timestamp desc, scoreId desc).
   *
   * The window runs over every row in the relevant leaderboards (required for a correct rank);
   * only `targets` score IDs are returned.
   */
  public static async getMedalTableScoreRanksForScores(
    targets: { scoreId: number; leaderboardId: number }[]
  ): Promise<Map<number, number>> {
    if (targets.length === 0) {
      return new Map();
    }
    const leaderboardIds = [...new Set(targets.map(t => t.leaderboardId))];
    const scoreIds = targets.map(t => t.scoreId);

    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          "scoreId",
          cast(
            row_number() over (
              partition by "leaderboardId"
              order by
                medals desc,
                timestamp desc,
                "scoreId" desc
            ) as integer
          ) AS rank
        FROM "scoresaber-medal-scores"
        WHERE "leaderboardId" IN (${sql.join(
          leaderboardIds.map(id => sql`${id}`),
          sql`, `
        )})
      )
      SELECT "scoreId", rank FROM ranked
      WHERE "scoreId" IN (${sql.join(
        scoreIds.map(id => sql`${id}`),
        sql`, `
      )})
    `);

    const rows = (result as unknown as { rows: { scoreId: number; rank: number }[] }).rows ?? [];
    return new Map(rows.map(r => [Number(r.scoreId), Number(r.rank)]));
  }

  /**
   * Refreshes the medal scores for all ranked leaderboards.
   */
  public static async rescanMedalScores() {
    MedalScoresService.IGNORE_SCORES = true;

    try {
      const rankedLeaderboards = await LeaderboardCoreService.getRankedLeaderboards();
      let updatedCount = 0;
      let skippedCount = 0;

      for (const [index, leaderboard] of rankedLeaderboards.entries()) {
        const needsUpdate = await this.rescanLeaderboardIfChanged(leaderboard.id);
        if (needsUpdate) {
          updatedCount++;
        } else {
          skippedCount++;
        }

        if (index % 100 === 0) {
          Logger.info(
            `[MEDAL SCORES] Processed ${index} of ${rankedLeaderboards.length} ranked leaderboards (${updatedCount} updated, ${skippedCount} skipped)`
          );
        }
      }

      Logger.info(
        `[MEDAL SCORES] Refreshed all ranked leaderboards: ${updatedCount} updated, ${skippedCount} skipped`
      );
    } finally {
      MedalScoresService.IGNORE_SCORES = false;

      for (const item of MedalScoresService.SCORES_INGEST_QUEUE.values()) {
        try {
          await MedalScoresService.handleIncomingMedalsScoreUpdate(item.score, item.beatLeaderScore);
        } catch (error) {
          Logger.error("[MEDAL SCORES] Failed to process queued score after rescan:", error);
        }
      }
      MedalScoresService.SCORES_INGEST_QUEUE.clear();
    }
  }

  /**
   * Rescans the medal scores for a leaderboard only if they have changed.
   *
   * @param leaderboardId the leaderboard id to rescan.
   * @returns true if scores were updated, false if they were unchanged
   */
  public static async rescanLeaderboardIfChanged(leaderboardId: number): Promise<boolean> {
    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);

    const page = await ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, 1, {
      priority: isProduction() ? CooldownPriority.BACKGROUND : CooldownPriority.NORMAL,
    });
    if (!page) {
      return false;
    }

    const top10ApiScores = page.scores
      .filter(s => s.rank <= 10)
      .map(s => ({
        scoreId: Number(s.id),
        playerId: s.leaderboardPlayerInfo.id,
        score: s.baseScore,
        rank: s.rank,
      }))
      .sort((a, b) => a.rank - b.rank);

    const existingRows = await db
      .select()
      .from(scoreSaberMedalScoresTable)
      .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId));

    const existingTop10 = sortMedalRowsByLeaderboardOrder(existingRows).slice(0, 10);
    const existingComparable = existingTop10.map((row, index) => ({
      scoreId: row.scoreId,
      playerId: row.playerId,
      rank: index + 1,
    }));

    if (existingComparable.length !== top10ApiScores.length) {
      await db
        .delete(scoreSaberMedalScoresTable)
        .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId));
      await this.insertMedalScores(page.scores, leaderboard);
      return true;
    }

    const scoresChanged = top10ApiScores.some((apiScore, index) => {
      const existingScore = existingComparable[index];
      return (
        !existingScore ||
        existingScore.scoreId !== apiScore.scoreId ||
        existingScore.rank !== apiScore.rank ||
        existingScore.playerId !== apiScore.playerId
      );
    });

    if (scoresChanged) {
      await db
        .delete(scoreSaberMedalScoresTable)
        .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId));
      await this.insertMedalScores(page.scores, leaderboard);
      return true;
    }

    return false;
  }

  /**
   * Inserts medal scores for a leaderboard.
   *
   * @param scores the scores from the API
   * @param leaderboard the leaderboard object
   */
  private static async insertMedalScores(
    scores: ScoreSaberScoreToken[],
    leaderboard: ScoreSaberLeaderboard
  ): Promise<void> {
    const rows: (typeof scoreSaberMedalScoresTable.$inferInsert)[] = [];
    for (const token of scores) {
      if (token.rank > 10) {
        continue;
      }
      const score = getScoreSaberScoreFromToken(token, leaderboard, token.leaderboardPlayerInfo.id);
      rows.push(medalScoreInsert(score));
    }
    if (rows.length === 0) {
      return;
    }
    await db.insert(scoreSaberMedalScoresTable).values(rows);
  }

  /**
   * Rescans the medal scores for a leaderboard.
   *
   * @param leaderboardId the leaderboard id to rescan.
   */
  public static async rescanLeaderboard(leaderboardId: number, deleteScores: boolean = false) {
    if (deleteScores) {
      await db
        .delete(scoreSaberMedalScoresTable)
        .where(eq(scoreSaberMedalScoresTable.leaderboardId, leaderboardId));
    }

    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);

    const page = await ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, 1, {
      priority: isProduction() ? CooldownPriority.BACKGROUND : CooldownPriority.NORMAL,
    });
    if (!page) {
      return;
    }

    await this.insertMedalScores(page.scores, leaderboard);
  }

  /**
   * Handles an incoming score to update the medals count for the player.
   *
   * @param score the incoming score.
   */
  public static async handleIncomingMedalsScoreUpdate(
    score: ScoreSaberScore,
    beatLeaderScore: BeatLeaderScore | undefined
  ) {
    if (score.rank > 10 || score.pp <= 0) {
      return;
    }

    if (MedalScoresService.IGNORE_SCORES) {
      MedalScoresService.SCORES_INGEST_QUEUE.set(score.scoreId, { score, beatLeaderScore });
      return;
    }

    async function updateMedalScores(): Promise<string[]> {
      const existingRows = await db
        .select()
        .from(scoreSaberMedalScoresTable)
        .where(eq(scoreSaberMedalScoresTable.leaderboardId, score.leaderboardId))
        .orderBy(desc(scoreSaberMedalScoresTable.score), desc(scoreSaberMedalScoresTable.scoreId));

      const oldScoreMedals = new Map<string, number>();
      for (const row of existingRows) {
        const current = oldScoreMedals.get(row.playerId) ?? 0;
        oldScoreMedals.set(row.playerId, current + row.medals);
      }

      const allScores: Array<ScoreSaberMedalScore> = existingRows.map(row =>
        scoreSaberMedalScoreRowToType(row)
      );

      const existingScoreIndex = allScores.findIndex(
        s => s.playerId === score.playerId && s.leaderboardId === score.leaderboardId
      );
      if (existingScoreIndex >= 0) {
        allScores[existingScoreIndex] = {
          ...scoreSaberMedalScoreRowToType(existingRows[existingScoreIndex]),
          ...scoreSaberScoreToMedalScore(score),
          medals: 0,
        };
      } else {
        allScores.push(scoreSaberScoreToMedalScore(score));
      }

      allScores.sort((a, b) => b.score - a.score || b.scoreId - a.scoreId);

      for (let i = 0; i < allScores.length; i++) {
        const rank = i + 1;
        allScores[i].rank = rank;
        allScores[i].medals = MEDAL_COUNTS[rank as keyof typeof MEDAL_COUNTS] ?? 0;
      }

      const top10Scores = allScores.slice(0, 10);

      const newScoreMedals = new Map<string, number>();
      for (const s of top10Scores) {
        const current = newScoreMedals.get(s.playerId) ?? 0;
        newScoreMedals.set(s.playerId, current + s.medals);
      }

      await db.transaction(async tx => {
        await tx
          .delete(scoreSaberMedalScoresTable)
          .where(eq(scoreSaberMedalScoresTable.leaderboardId, score.leaderboardId));
        if (top10Scores.length > 0) {
          await tx.insert(scoreSaberMedalScoresTable).values(top10Scores.map(s => medalScoreInsert(s)));
        }
      });

      const allPlayerIds = new Set([...oldScoreMedals.keys(), ...newScoreMedals.keys()]);
      return Array.from(allPlayerIds).filter(playerId => {
        const oldCount = oldScoreMedals.get(playerId) ?? 0;
        const newCount = newScoreMedals.get(playerId) ?? 0;
        return oldCount !== newCount;
      });
    }

    async function getChanges(affectedPlayerIds: string[]): Promise<Map<string, MedalChange>> {
      const playersBefore = await db
        .select({ id: scoreSaberAccountsTable.id, medals: scoreSaberAccountsTable.medals })
        .from(scoreSaberAccountsTable)
        .where(inArray(scoreSaberAccountsTable.id, Array.from(affectedPlayerIds)));

      const medalsBefore = Object.fromEntries(playersBefore.map(p => [p.id, p.medals ?? 0]));
      const medalsAfter = await PlayerMedalsService.updatePlayerMedalCounts(...affectedPlayerIds);

      const changes = new Map<string, MedalChange>();
      for (const playerId of affectedPlayerIds) {
        const before = medalsBefore[playerId] ?? 0;
        const after = medalsAfter[playerId] ?? 0;
        if (before !== after) {
          changes.set(playerId, { before, after });
        }
      }

      return changes;
    }

    const medalChanges = await updateMedalScores();

    if (medalChanges.length === 0) {
      return;
    }
    const changes = await getChanges(medalChanges);

    Logger.info(
      `[MEDAL SCORES] Medal changes on leaderboard ${score.leaderboardId}: ${Array.from(changes.entries())
        .map(([playerId, change]) => `${playerId}: ${change.before} -> ${change.after}`)
        .join(", ")}`
    );

    const leaderboard = await LeaderboardCoreService.getLeaderboard(score.leaderboardId);
    await sendMedalScoreNotification(score, leaderboard, beatLeaderScore, changes);
  }
}
