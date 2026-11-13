import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberAccountNamesTable } from "../db/schema";

export class ScoreSaberAccountNamesRepository {
  /**
   * Gets the names a player used before their current one, most recently replaced first.
   *
   * @param playerId the player's id
   */
  public static async findNamesByPlayerId(playerId: string): Promise<string[]> {
    const rows = await db
      .select({ name: scoreSaberAccountNamesTable.name })
      .from(scoreSaberAccountNamesTable)
      .where(eq(scoreSaberAccountNamesTable.playerId, playerId))
      .orderBy(desc(scoreSaberAccountNamesTable.changedAt));
    return rows.map(row => row.name);
  }

  /**
   * Records a name change: the old name goes into the history and the new name, if it was used
   * before, leaves it since it is the current name again.
   *
   * @param playerId the player's id
   * @param oldName the name the player had
   * @param newName the name the player has now
   */
  public static async recordNameChange(playerId: string, oldName: string, newName: string): Promise<void> {
    await db.transaction(async tx => {
      await tx
        .delete(scoreSaberAccountNamesTable)
        .where(
          and(
            eq(scoreSaberAccountNamesTable.playerId, playerId),
            eq(scoreSaberAccountNamesTable.name, newName)
          )
        );

      if (oldName === "") {
        return;
      }
      await tx
        .insert(scoreSaberAccountNamesTable)
        .values({ playerId, name: oldName })
        .onConflictDoUpdate({
          target: [scoreSaberAccountNamesTable.playerId, scoreSaberAccountNamesTable.name],
          set: { changedAt: new Date() },
        });
    });
  }
}
