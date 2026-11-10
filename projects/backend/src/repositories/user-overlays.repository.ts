import type { OverlayConnectionSettings } from "@ssr/common/schemas/overlay/overlay-connection-settings";
import type { OverlayLayout } from "@ssr/common/schemas/overlay/overlay-layout";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { authUsersTable, userOverlaysTable } from "../db/schema";

export type UserOverlayRow = typeof userOverlaysTable.$inferSelect;
export type UserOverlaySummaryRow = Pick<UserOverlayRow, "id" | "name" | "updatedAt">;

export type NewUserOverlayValues = {
  name: string;
  settings: OverlayConnectionSettings;
  layout: OverlayLayout;
};

export class UserOverlaysRepository {
  /**
   * Gets the overlays of a user, most recently changed first.
   *
   * @param userId the user to get the overlays of
   */
  public static getSummaries(userId: string): Promise<UserOverlaySummaryRow[]> {
    return db
      .select({
        id: userOverlaysTable.id,
        name: userOverlaysTable.name,
        updatedAt: userOverlaysTable.updatedAt,
      })
      .from(userOverlaysTable)
      .where(eq(userOverlaysTable.userId, userId))
      .orderBy(desc(userOverlaysTable.updatedAt));
  }

  /**
   * Gets an overlay by its id.
   *
   * @param id the id of the overlay
   */
  public static async findById(id: string): Promise<UserOverlayRow | undefined> {
    const [row] = await db.select().from(userOverlaysTable).where(eq(userOverlaysTable.id, id)).limit(1);
    return row;
  }

  /**
   * Creates an overlay for a user, unless the user already has `maxOverlays`.
   *
   * @param userId the owner of the overlay
   * @param values the content of the overlay
   * @param maxOverlays how many overlays a user can have
   */
  public static async create(
    userId: string,
    values: NewUserOverlayValues,
    maxOverlays: number
  ): Promise<UserOverlayRow | "limit-reached"> {
    return db.transaction(async tx => {
      // Lock the user so two creations can't both slip under the limit
      await tx
        .select({ id: authUsersTable.id })
        .from(authUsersTable)
        .where(eq(authUsersTable.id, userId))
        .for("update");

      const [{ total }] = await tx
        .select({ total: count() })
        .from(userOverlaysTable)
        .where(eq(userOverlaysTable.userId, userId));
      if (total >= maxOverlays) {
        return "limit-reached";
      }

      const [row] = await tx
        .insert(userOverlaysTable)
        .values({ userId, ...values })
        .returning();
      return row;
    });
  }

  /**
   * Updates an overlay of a user.
   *
   * @param id the id of the overlay
   * @param userId the owner of the overlay
   * @param patch the fields to change
   * @returns the updated overlay, or undefined if the user has no such overlay
   */
  public static async update(
    id: string,
    userId: string,
    patch: { name?: string; settings?: OverlayConnectionSettings; layout?: OverlayLayout }
  ): Promise<UserOverlayRow | undefined> {
    const [row] = await db
      .update(userOverlaysTable)
      .set(patch)
      .where(and(eq(userOverlaysTable.id, id), eq(userOverlaysTable.userId, userId)))
      .returning();
    return row;
  }

  /**
   * Deletes an overlay of a user.
   *
   * @param id the id of the overlay
   * @param userId the owner of the overlay
   * @returns whether an overlay was deleted
   */
  public static async delete(id: string, userId: string): Promise<boolean> {
    const rows = await db
      .delete(userOverlaysTable)
      .where(and(eq(userOverlaysTable.id, id), eq(userOverlaysTable.userId, userId)))
      .returning({ id: userOverlaysTable.id });
    return rows.length > 0;
  }
}
