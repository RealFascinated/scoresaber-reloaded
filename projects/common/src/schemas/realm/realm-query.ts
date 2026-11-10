import { Type, type StaticDecode } from "typebox";

/**
 * A realm id. Query strings arrive as text, so it is decoded from a string or number.
 */
const isRealmId = (v: string | number): boolean => {
  const n = typeof v === "number" ? v : Number(v);
  return v !== "" && Number.isInteger(n) && n >= 1;
};

const RealmIdTransform = Type.Codec(
  Type.Refine(
    Type.Union([Type.String(), Type.Number()]),
    isRealmId,
    () => "Expected a realm id that is an integer >= 1"
  )
)
  .Decode((v): number => Number(v))
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
