import { z } from "zod";

export const BeatLeaderSongSchema = z
  .object({
    id: z.string(),
    hash: z.string(),
    name: z.string(),
    subName: z.string(),
    author: z.string(),
    mapperId: z.union([z.string(), z.number()]),
    coverImage: z.string(),
    fullCoverImage: z.union([z.string(), z.null()]).optional(),
    bpm: z.number(),
    duration: z.number(),
    downloadUrl: z.string().optional(),
    tags: z.string().optional(),
    uploadTime: z.number().optional(),
    difficulties: z.null().optional(),
  })
  .loose();

export type BeatLeaderSongToken = z.infer<typeof BeatLeaderSongSchema>;
