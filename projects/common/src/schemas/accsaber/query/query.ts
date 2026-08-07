import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * AccSaber score sort options (mapped to `ScoreResponse` fields in the REST API).
 */
export const accSaberScoreSortSchema = Type.Union([
  Type.Literal("date"),
  Type.Literal("ap"),
  Type.Literal("acc"),
  Type.Literal("complexity"),
  Type.Literal("ranking"),
]);
export type AccSaberScoreSort = StaticDecode<typeof accSaberScoreSortSchema>;

/**
 * AccSaber score types (mapped to AccSaber category codes: overall, true_acc,
 * tech_acc, standard_acc).
 */
export const accSaberScoreTypeSchema = Type.Union([
  Type.Literal("overall"),
  Type.Literal("true"),
  Type.Literal("tech"),
  Type.Literal("standard"),
]);
export type AccSaberScoreType = StaticDecode<typeof accSaberScoreTypeSchema>;
