import { z } from "zod";

export const BeatSaverAccountSchema = z.object({
  id: z.number(),
  name: z.string(),
  hash: z.string(),
  avatar: z.string(),
  type: z.string(),
  admin: z.boolean(),
  curator: z.boolean(),
  seniorCurator: z.boolean(),
  verifiedMapper: z.boolean(),
  playlistUrl: z.string(),
});