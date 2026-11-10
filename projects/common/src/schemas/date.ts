import { Type } from "typebox";

/**
 * Checks whether a value can be turned into a valid {@link Date}.
 *
 * @param value the value to check
 * @returns true if the value is a valid Date, or an ISO string / timestamp that parses to one
 */
function isDateInput<TValue>(value: TValue): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value === "string" || typeof value === "number") {
    return !Number.isNaN(new Date(value).getTime());
  }
  return false;
}

const DateInputSchema = Type.Unsafe<Date | string | number>(
  Type.Refine(Type.Unknown(), isDateInput, () => "Expected a valid Date, ISO date string or timestamp")
);

/**
 * A JavaScript {@link Date}. TypeBox 1.x has no built-in Date type, so this accepts a Date, an
 * ISO date string or a timestamp (the conversion TypeBox 0.34's `Type.Date` did when parsing)
 * and decodes it to a `Date`.
 */
export const DateSchema = Type.Codec(DateInputSchema)
  .Decode((value): Date => (value instanceof Date ? value : new Date(value)))
  .Encode((value): Date | string | number => value);
