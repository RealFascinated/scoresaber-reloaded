import { z } from "zod";

export const McpPlayerProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  rank: z.number(),
  countryRank: z.number(),
  country: z.string(),
  pp: z.number(),
  medals: z.number(),
  medalsRank: z.number(),
  medalsCountryRank: z.number(),
  hmd: z.string().optional(),
  joinedDate: z.coerce.date(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  inactive: z.boolean(),
  banned: z.boolean(),
});

export type McpPlayerProfile = z.infer<typeof McpPlayerProfileSchema>;
