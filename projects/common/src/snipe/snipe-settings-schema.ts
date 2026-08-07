import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberScoreSortFieldSchema } from "../schemas/score/query/sort/scoresaber-scores-sort";
import { SortDirectionSchema } from "../schemas/score/query/sort/sort-direction";

export const snipeSettingsSchema = Type.Object({
  sort: ScoreSaberScoreSortFieldSchema,
  sortDirection: SortDirectionSchema,
  rankedStatus: Type.Union([Type.Literal("all"), Type.Literal("ranked"), Type.Literal("unranked")]),
  requireBothScores: Type.Boolean(),
  starRange: Type.Object({
    min: Type.Number({ minimum: 0, maximum: 20 }),
    max: Type.Number({ minimum: 0, maximum: 20 }),
  }),
  accuracyRange: Type.Object({
    min: Type.Number({ minimum: 0, maximum: 100 }),
    max: Type.Number({ minimum: 0, maximum: 100 }),
  }),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
});

export type SnipeSettings = StaticDecode<typeof snipeSettingsSchema>;
