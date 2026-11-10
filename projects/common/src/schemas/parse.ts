import { type StaticDecode, type TSchema } from "typebox";
import { Value } from "typebox/value";

/**
 * Prepares (clone, clean, default, convert), validates and decodes a value with the given schema.
 *
 * This mirrors the `Value.Parse` pipeline of TypeBox 0.34. TypeBox 1.x's `Value.Parse` only
 * validates (it returns an already valid value untouched, so extra properties are not stripped and
 * defaults are not applied) and never runs codec decode callbacks (e.g. `Type.Codec` fields).
 *
 * @param schema the schema to parse with
 * @param value the raw value to parse
 * @returns the decoded value
 * @throws if the value does not match the schema
 */
export function parseSchema<const Schema extends TSchema, Input>(
  schema: Schema,
  value: Input
): StaticDecode<Schema> {
  const cloned = Value.Clone(value);
  const cleaned = Value.Clean(schema, cloned);
  const withDefaults = Value.Default(schema, cleaned);
  const converted = Value.Convert(schema, withDefaults);
  return Value.Decode(schema, converted);
}
