import { z } from "zod";

export const DetailTypeSchema = z.enum(["basic", "full"]).default("basic");
export type DetailType = z.infer<typeof DetailTypeSchema>;
