import { z } from "zod";

const HealthResponseSchema = z.object({
  status: z.literal("OK"),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
