import { z } from "zod";

export const PlayerRefreshResponseSchema = z.object({
  result: z.boolean(),
});
export type PlayerRefreshResponse = z.infer<typeof PlayerRefreshResponseSchema>;
