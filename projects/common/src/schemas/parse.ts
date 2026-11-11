import { type StaticDecode, type TSchema } from "typebox";
import { Compile, type Validator } from "typebox/compile";
import { Value } from "typebox/value";

/**
 * Compiled validators by schema. `Value.Decode` re-walks the schema for every check and costs
 * hundreds of milliseconds on a 100 score page, which blocks the event loop; a compiled validator
 * does the same work in a fraction of that.
 */
const validators = new WeakMap<TSchema, Validator>();

function getValidator(schema: TSchema): Validator {
  let validator = validators.get(schema);
  if (validator === undefined) {
    validator = Compile(schema);
    validators.set(schema, validator);
  }
  return validator;
}

/**
 * Whether a value matches the given schema, using the compiled validator.
 */
export function checkSchema(schema: TSchema, value: unknown): boolean {
  return getValidator(schema).Check(value);
}

/**
 * Decodes a value that already passed `checkSchema`, only stripping extra properties and running
 * codec decode callbacks. It skips the clone, default and convert steps of `parseSchema`, so it is
 * only equivalent for schemas without `default` values; the value is mutated in place.
 *
 * @throws if the value does not match the schema
 */
export function parseCheckedSchema<const Schema extends TSchema>(
  schema: Schema,
  value: unknown
): StaticDecode<Schema> {
  return getValidator(schema).Decode(Value.Clean(schema, value)) as StaticDecode<Schema>;
}

/**
 * Prepares (clone, clean, default, convert), validates and decodes a value with the given schema.
 *
 * This mirrors the `Value.Parse` pipeline of TypeBox 0.34. TypeBox 1.x's `Value.Parse` only
 * validates (it returns an already valid value untouched, so extra properties are not stripped and
 * defaults are not applied) and never runs codec decode callbacks (e.g. `Type.Codec` fields).
 *
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
  return getValidator(schema).Decode(converted) as StaticDecode<Schema>;
}
