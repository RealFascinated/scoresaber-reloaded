import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderSongSchema } from "../score/song";
import { BeatLeaderDifficultySchema } from "./difficulty";

/** Player /scores and similar endpoints often return only id + song + difficulty. */
export const BeatLeaderLeaderboardSchema = Type.Object({
  id: Type.String(),
  song: BeatLeaderSongSchema,
  difficulty: BeatLeaderDifficultySchema,
});

export type BeatLeaderLeaderboardToken = StaticDecode<typeof BeatLeaderLeaderboardSchema>;
