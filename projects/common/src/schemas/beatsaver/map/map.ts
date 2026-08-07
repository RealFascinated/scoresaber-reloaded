import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverAccountSchema } from "../account";
import { BeatSaverMapDifficultySchema } from "./difficulty";
import { BeatSaverMapMetadataSchema } from "./metadata";

export const BeatSaverMapSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  bsr: Type.String(),
  songArt: Type.String(),
  author: BeatSaverAccountSchema,
  difficulty: BeatSaverMapDifficultySchema,
  metadata: BeatSaverMapMetadataSchema,
});

export type BeatSaverMap = StaticDecode<typeof BeatSaverMapSchema>;
