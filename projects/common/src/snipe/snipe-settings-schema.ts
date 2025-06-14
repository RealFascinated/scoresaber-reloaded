import { z } from "zod";

export const snipeSettingsSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  sort: z.enum(["top", "recent"]),
  limit: z.number().min(25).max(250),
  starRange: z.object({
    min: z.number().min(1).max(20),
    max: z.number().min(2).max(20),
  }),
  accuracyRange: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  }),
});

export type SnipeSettings = z.infer<typeof snipeSettingsSchema>;
