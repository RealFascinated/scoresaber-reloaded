import { z } from "zod";

export const AppInfoResponseSchema = z.object({
  app: z.string(),
  version: z.string(),
});
export type AppInfoResponse = z.infer<typeof AppInfoResponseSchema>;
