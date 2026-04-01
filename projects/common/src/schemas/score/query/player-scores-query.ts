import z from "zod";
import { HmdSchema } from "../../../hmds";

const PlayerIdsSchema = z
  .union([z.string(), z.array(z.string()), z.undefined()])
  .transform((v): string[] | undefined =>
    v === undefined ? undefined : typeof v === "string" ? v.split(",") : v
  );

export const PlayerScoresQuerySchema = z.object({
  search: z.string().optional(),
  hmd: HmdSchema.optional(),
  playerIds: PlayerIdsSchema.optional(),
});
export type PlayerScoresQuery = z.infer<typeof PlayerScoresQuerySchema>;
