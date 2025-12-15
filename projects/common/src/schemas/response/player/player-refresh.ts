import { z } from "zod";

const PlayerRefreshResponseSchema = z.object({
  result: z.boolean(),
});
export type PlayerRefreshResponse = z.infer<typeof PlayerRefreshResponseSchema>;
