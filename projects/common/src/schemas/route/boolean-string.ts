import { Type } from "typebox";

/**
 * A boolean that arrives as a query string: accepts a real boolean or the text "true" / "false".
 */
const StringifiedBooleanSchema = Type.Codec(
  Type.Refine(
    Type.String(),
    v => v === "true" || v === "false",
    () => "must be boolean"
  )
)
  .Decode((v): boolean => v === "true")
  .Encode(v => (v ? "true" : "false"));

export const BooleanStringSchema = Type.Union([Type.Boolean(), StringifiedBooleanSchema]);
