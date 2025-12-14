import { z } from "zod";

export const DetailTypeSchema = z.union([z.literal("basic"), z.literal("full")]).default("basic");
export type DetailType = z.infer<typeof DetailTypeSchema>;
