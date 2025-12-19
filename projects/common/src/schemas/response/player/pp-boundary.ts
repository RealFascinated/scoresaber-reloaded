import { z } from "zod";

const PpGainResponseSchema = z.object({
  boundaries: z.array(z.number()),
  count: z.number(),
});
export type PpGainResponse = z.infer<typeof PpGainResponseSchema>;
