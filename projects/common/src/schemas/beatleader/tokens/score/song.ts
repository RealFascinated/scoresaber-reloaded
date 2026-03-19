import { z } from "zod";

export const BeatLeaderSongSchema = z
  .object({
    id: z.string(),
    hash: z.string(),
    name: z.string(),
    subName: z.string(),
    author: z.string(),
    mapperId: z.string(),
    coverImage: z.string(),
    fullCoverImage: z.string(),
    downloadUrl: z.string(),
    bpm: z.number(),
    duration: z.number(),
    tags: z.string(),
    uploadTime: z.number(),
    difficulties: z.null(),
  })
  .passthrough();

export type BeatLeaderSongToken = z.infer<typeof BeatLeaderSongSchema>;
