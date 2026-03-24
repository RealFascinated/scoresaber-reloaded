import { z } from "zod";

export const accSaberScoreSongSchema = z.object({
  hash: z.string(),
  name: z.string(),
  subName: z.string(),
  author: z.string(),
  mapper: z.string(),
  beatsaverKey: z.string(),
});
