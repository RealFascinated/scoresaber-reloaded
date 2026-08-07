import { eq } from "drizzle-orm";
import { db } from "../db";
import { beatLeaderPlayersTable, type BeatLeaderPlayerRow } from "../db/schema";

export type BeatLeaderPlayerInsert = typeof beatLeaderPlayersTable.$inferInsert;

export class BeatLeaderPlayersRepository {
  public static async findById(id: string): Promise<BeatLeaderPlayerRow | undefined> {
    const rows = await db
      .select()
      .from(beatLeaderPlayersTable)
      .where(eq(beatLeaderPlayersTable.id, id))
      .limit(1);
    return rows[0];
  }

  public static async upsert(row: BeatLeaderPlayerInsert): Promise<BeatLeaderPlayerRow> {
    const [inserted] = await db
      .insert(beatLeaderPlayersTable)
      .values(row)
      .onConflictDoUpdate({
        target: beatLeaderPlayersTable.id,
        set: {
          name: row.name,
          platform: row.platform,
          steamId: row.steamId,
          oculusPCId: row.oculusPCId,
          questId: row.questId,
          lastFetched: row.lastFetched,
        },
      })
      .returning();
    return inserted;
  }
}
