import { ScoreSaberPlayerHistory } from "@ssr/common/schemas/scoresaber/player/history";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { type PlayerHistoryRow, playerHistoryTable } from "../db/schema";

export type DailyScoreCounterKey =
  | "rankedScores"
  | "unrankedScores"
  | "rankedScoresImproved"
  | "unrankedScoresImproved";

export class PlayerHistoryRepository {
  public static async findByPlayerAndDate(
    playerId: string,
    date: Date
  ): Promise<PlayerHistoryRow | undefined> {
    const [row] = await db
      .select()
      .from(playerHistoryTable)
      .where(and(eq(playerHistoryTable.playerId, playerId), eq(playerHistoryTable.date, date)));
    return row;
  }

  public static async upsertByPlayerAndDate(
    playerId: string,
    date: Date,
    existingEntry: PlayerHistoryRow | undefined,
    data: ScoreSaberPlayerHistory
  ): Promise<void> {
    if (existingEntry) {
      await db
        .update(playerHistoryTable)
        .set(data)
        .where(and(eq(playerHistoryTable.playerId, playerId), eq(playerHistoryTable.date, date)));
    } else {
      await db.insert(playerHistoryTable).values({ playerId, date, ...data });
    }
  }

  public static async getByPlayerOrderedByDateDesc(
    playerId: string,
    options: { count: number; alignedStart: Date; today: Date }
  ): Promise<PlayerHistoryRow[]> {
    const { count: dayCount, alignedStart, today } = options;
    const base = db
      .select()
      .from(playerHistoryTable)
      .where(
        dayCount > 0
          ? and(
              eq(playerHistoryTable.playerId, playerId),
              gte(playerHistoryTable.date, alignedStart),
              lte(playerHistoryTable.date, today)
            )
          : eq(playerHistoryTable.playerId, playerId)
      )
      .orderBy(desc(playerHistoryTable.date));
    return await (dayCount > 0 ? base.limit(dayCount) : base);
  }

  public static async upsertRank(playerId: string, date: Date, rank: number): Promise<void> {
    await db
      .insert(playerHistoryTable)
      .values({ playerId, date, rank })
      .onConflictDoUpdate({
        target: [playerHistoryTable.playerId, playerHistoryTable.date],
        set: { rank },
      });
  }

  public static async incrementDailyCounter(
    playerId: string,
    date: Date,
    counterKey: DailyScoreCounterKey
  ): Promise<void> {
    const incrementSet = (() => {
      switch (counterKey) {
        case "rankedScores":
          return { rankedScores: sql`COALESCE(${playerHistoryTable.rankedScores}, 0) + 1` };
        case "unrankedScores":
          return { unrankedScores: sql`COALESCE(${playerHistoryTable.unrankedScores}, 0) + 1` };
        case "rankedScoresImproved":
          return { rankedScoresImproved: sql`COALESCE(${playerHistoryTable.rankedScoresImproved}, 0) + 1` };
        case "unrankedScoresImproved":
          return {
            unrankedScoresImproved: sql`COALESCE(${playerHistoryTable.unrankedScoresImproved}, 0) + 1`,
          };
      }
    })();

    await db
      .insert(playerHistoryTable)
      .values({
        playerId,
        date,
        [counterKey]: 1,
      })
      .onConflictDoUpdate({
        target: [playerHistoryTable.playerId, playerHistoryTable.date],
        set: incrementSet,
      });
  }

  public static async countRowsForPlayer(playerId: string): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(playerHistoryTable)
      .where(eq(playerHistoryTable.playerId, playerId));
    return row?.c ?? 0;
  }
}
