import { z } from "zod";

export const BeatSaverMapMetadataSchema = z.object({
  bpm: z.number(),
  duration: z.number(),
  songName: z.string(),
  songSubName: z.string(),
  songAuthorName: z.string(),
  songAuthorUrl: z.string(),
  levelAuthorName: z.string(),
});