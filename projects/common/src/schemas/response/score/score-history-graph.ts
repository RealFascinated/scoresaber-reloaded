import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreHistoryGraphSchema = Type.Array(
  Type.Object({
    timestamp: Type.Date(),
    accuracy: Type.Number(),
  })
);
export type ScoreHistoryGraph = StaticDecode<typeof ScoreHistoryGraphSchema>;
