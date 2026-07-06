import { z } from "zod";
import { McpSongRefSchema } from "../fragments/song-ref";

export const McpLeaderboardDetailSchema = z.object({
  leaderboardId: z.number(),
  song: McpSongRefSchema,
  ranked: z.boolean(),
  qualified: z.boolean(),
  plays: z.number(),
  beatsaverName: z.string().optional(),
  beatsaverBsr: z.string().optional(),
  levelAuthor: z.string().optional(),
});

export type McpLeaderboardDetail = z.infer<typeof McpLeaderboardDetailSchema>;
