import { Type } from "typebox";
import { RealmQuerySchema } from "../realm/realm-query";
import { BooleanStringSchema } from "../route/boolean-string";

export const PlayerRankingQuerySchema = Type.Object({
  ...RealmQuerySchema.properties,
  country: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  includeInactives: Type.Optional(BooleanStringSchema),
});

export const MedalRankingQuerySchema = Type.Object({
  country: Type.Optional(Type.String()),
});
