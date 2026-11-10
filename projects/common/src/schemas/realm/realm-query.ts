import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * A realm id. Query strings arrive as text, so it is decoded from a string or number.
 */
const RealmIdTransform = Type.Transform(Type.Union([Type.String(), Type.Number()]))
  .Decode(v => {
    const n = typeof v === "number" ? v : Number(v);
    if (v === "" || !Number.isInteger(n) || n < 1) {
      throw new Error("Expected a realm id that is an integer >= 1");
    }
    return n;
  })
  .Encode(v => v);

// Elysia types handlers from the schema's input type, which is `string | number` for the transform
export const RealmIdSchema = Type.Unsafe<number>(RealmIdTransform);

/**
 * Optional realm selector shared by every realm-aware endpoint. Omitting it selects the default realm.
 */
export const RealmQuerySchema = Type.Object({
  realmId: Type.Optional(RealmIdSchema),
});
export type RealmQuery = StaticDecode<typeof RealmQuerySchema>;
