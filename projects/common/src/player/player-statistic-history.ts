import { PlayerHistoryEntry } from "../model/player/player-history-entry";

export type FlattenedPlayerHistory = Omit<PlayerHistoryEntry, "_id" | "__v" | "playerId" | "date">;
export type PlayerStatisticHistory = Record<string, FlattenedPlayerHistory>;
