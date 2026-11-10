import { Type } from "typebox";

export enum HistoryMode {
  ADVANCED = "advanced",
  SIMPLE = "simple",
}
export const HistoryModeSchema = Type.Enum(HistoryMode);
