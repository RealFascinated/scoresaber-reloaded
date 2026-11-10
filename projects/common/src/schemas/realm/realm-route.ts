import { Type } from "typebox";

export const RealmPpCurveParamsSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
});
