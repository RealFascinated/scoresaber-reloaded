import { z } from "zod";

const PpBoundaryResponseSchema = z.object({
  boundaries: z.array(z.number()),
  boundary: z.number(),
});
export type PpBoundaryResponse = z.infer<typeof PpBoundaryResponseSchema>;
