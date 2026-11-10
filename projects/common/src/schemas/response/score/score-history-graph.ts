import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../../date";

export const ScoreHistoryGraphSchema = Type.Array(
  Type.Object({
    timestamp: DateSchema,
    accuracy: Type.Number(),
  })
);
export type ScoreHistoryGraph = StaticDecode<typeof ScoreHistoryGraphSchema>;
