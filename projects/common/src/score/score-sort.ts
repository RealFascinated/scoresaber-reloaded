import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberScoreSortSchema = Type.Union([Type.Literal("top"), Type.Literal("recent")]);
export type ScoreSaberScoreSort = StaticDecode<typeof ScoreSaberScoreSortSchema>;
