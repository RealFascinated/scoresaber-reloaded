import { z } from "zod";

export const BeatLeaderModifierSchema = z
  .object({
    modifierId: z.number(),
    da: z.number(),
    fs: z.number(),
    sf: z.number(),
    ss: z.number(),
    gn: z.number(),
    na: z.number(),
    nb: z.number(),
    nf: z.number(),
    no: z.number(),
    pm: z.number(),
    sc: z.number(),
    sa: z.number(),
    op: z.number(),
  })
  .loose();

export type BeatLeaderModifierToken = z.infer<typeof BeatLeaderModifierSchema>;
