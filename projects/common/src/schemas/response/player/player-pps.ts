import { z } from "zod";

export const PlayerPpsResponseSchema = z.object({
  scores: z.array(
    z.object({
      pp: z.number(),
      weight: z.number(),
      scoreId: z.string(),
    })
  ),
});
export type PlayerPpsResponse = z.infer<typeof PlayerPpsResponseSchema>;
