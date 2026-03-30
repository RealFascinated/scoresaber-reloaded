import { z } from "zod";
import { BeatSaverAccountSchema } from "../account";
import { BeatSaverMapDifficultySchema } from "./difficulty";
import { BeatSaverMapMetadataSchema } from "./metadata";

export const BeatSaverMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bsr: z.string(),
  songArt: z.string(),
  author: BeatSaverAccountSchema,
  difficulty: BeatSaverMapDifficultySchema,
  metadata: BeatSaverMapMetadataSchema,
});

export type BeatSaverMap = z.infer<typeof BeatSaverMapSchema>;