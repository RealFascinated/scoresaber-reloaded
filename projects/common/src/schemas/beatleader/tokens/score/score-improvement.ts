import { Type, type StaticDecode } from "@sinclair/typebox";

export const BeatLeaderScoreImprovementSchema = Type.Object({
  id: Type.Number(),
  // BeatLeader REST sometimes returns this as a unix timestamp number, but it can also be an empty string.
  timeset: Type.Union([Type.Number(), Type.String()]),
  score: Type.Number(),
  accuracy: Type.Number(),
  pp: Type.Number(),
  bonusPp: Type.Number(),
  rank: Type.Number(),
  accRight: Type.Number(),
  accLeft: Type.Number(),
  averageRankedAccuracy: Type.Number(),
  totalPp: Type.Number(),
  totalRank: Type.Number(),
  badCuts: Type.Number(),
  missedNotes: Type.Number(),
  bombCuts: Type.Number(),
  wallsHit: Type.Number(),
  pauses: Type.Number(),
  modifiers: Type.Optional(Type.String()),
});

export type BeatLeaderScoreImprovementToken = StaticDecode<typeof BeatLeaderScoreImprovementSchema>;
