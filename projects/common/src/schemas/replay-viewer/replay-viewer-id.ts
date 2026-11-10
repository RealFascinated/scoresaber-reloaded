import { Type, type StaticDecode } from "typebox";

/**
 * The ids of the replay viewers. The replay viewer registry is keyed by this type, so adding a
 * viewer here fails to compile until it is also registered.
 */
export const ReplayViewerIdSchema = Type.Union([
  Type.Literal("beatleader"),
  Type.Literal("arcviewer"),
  Type.Literal("chroviewer"),
]);

export type ReplayViewerId = StaticDecode<typeof ReplayViewerIdSchema>;
