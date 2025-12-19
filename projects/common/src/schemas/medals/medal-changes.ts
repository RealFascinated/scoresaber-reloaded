import { z } from "zod";

export const MedalChangeSchema = z.object({
  before: z.number(),
  after: z.number(),
});
export type MedalChange = z.infer<typeof MedalChangeSchema>;
