import {
  InvalidToolInputError,
  type JSONSchema7,
  type JSONValue,
  type ToolCallRepairFunction,
  type ToolSet,
} from "ai";

const LONG_INTEGER_OUTSIDE_STRINGS = /"(?:[^"\\]|\\.)*"|(?<![\w.+-])(-?\d{16,})(?![\w.])/g;
const NUMBER_TEXT = /^-?\d+(?:\.\d+)?$/;

export type ToolInputRepairKind =
  | "long_integer"
  | "number_to_string"
  | "string_to_number"
  | "string_to_boolean"
  | "json_text"
  | "wrap_array";

type SchemaType = "string" | "number" | "integer" | "boolean" | "null" | "array" | "object";
type SchemaDefinition = NonNullable<JSONSchema7["properties"]>[string];
type JsonObject = { [key: string]: JSONValue };

function quoteLongIntegers(input: string) {
  return input.replace(LONG_INTEGER_OUTSIDE_STRINGS, (match, digits?: string) =>
    digits === undefined ? match : `"${digits}"`
  );
}

const isSchema: (schema: SchemaDefinition | undefined) => schema is JSONSchema7 = (
  schema
): schema is JSONSchema7 => typeof schema === "object";

function isObject(value: JSONValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaTypes(schema: JSONSchema7) {
  const types: SchemaType[] =
    schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
  return types;
}

function matchesType(value: JSONValue, type: SchemaType) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return isObject(value);
  }
}

function matchesSchema(value: JSONValue, schema: JSONSchema7) {
  return schemaTypes(schema).some(type => matchesType(value, type));
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as JSONValue;
  } catch {
    return undefined;
  }
}

function convertToType(value: JSONValue, type: SchemaType) {
  switch (type) {
    case "string":
      return typeof value === "number" || typeof value === "boolean"
        ? { value: String(value), kind: "number_to_string" as const }
        : undefined;
    case "number":
    case "integer": {
      if (typeof value !== "string" || !NUMBER_TEXT.test(value.trim())) {
        return undefined;
      }
      const parsed = Number(value.trim());
      return type === "integer" && !Number.isSafeInteger(parsed)
        ? undefined
        : { value: parsed, kind: "string_to_number" as const };
    }
    case "boolean": {
      const text = typeof value === "string" ? value.trim().toLowerCase() : "";
      if (text === "true") {
        return { value: true, kind: "string_to_boolean" as const };
      }
      return text === "false" ? { value: false, kind: "string_to_boolean" as const } : undefined;
    }
    case "array": {
      if (typeof value === "string") {
        const parsed = parseJson(value);
        return Array.isArray(parsed)
          ? { value: parsed, kind: "json_text" as const }
          : { value: [value], kind: "wrap_array" as const };
      }
      return Array.isArray(value) ? undefined : { value: [value], kind: "wrap_array" as const };
    }
    case "object": {
      const parsed = typeof value === "string" ? parseJson(value) : undefined;
      return parsed !== undefined && isObject(parsed)
        ? { value: parsed, kind: "json_text" as const }
        : undefined;
    }
    case "null":
      return undefined;
  }
}

const coerceChildren: (value: JSONValue, schema: JSONSchema7, kinds: ToolInputRepairKind[]) => JSONValue = (
  value,
  schema,
  kinds
) => {
  if (Array.isArray(value) && isSchema(Array.isArray(schema.items) ? undefined : schema.items)) {
    const items = schema.items as JSONSchema7;
    return value.map(item => coerce(item, items, kinds));
  }
  if (isObject(value) && schema.properties !== undefined) {
    const properties = schema.properties;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => {
        const childSchema = properties[key];
        return [key, isSchema(childSchema) ? coerce(child, childSchema, kinds) : child];
      })
    );
  }
  return value;
};

const coerce: (value: JSONValue, schema: JSONSchema7, kinds: ToolInputRepairKind[]) => JSONValue = (
  value,
  schema,
  kinds
) => {
  const variants: JSONSchema7[] | undefined = (schema.anyOf ?? schema.oneOf)?.filter(isSchema);
  if (variants !== undefined) {
    const accepting = variants.find(variant => matchesSchema(value, variant));
    if (accepting !== undefined) {
      return coerce(value, accepting, kinds);
    }
    for (const variant of variants) {
      const attempt: ToolInputRepairKind[] = [];
      const converted = coerce(value, variant, attempt);
      if (matchesSchema(converted, variant)) {
        kinds.push(...attempt);
        return converted;
      }
    }
    return value;
  }

  const types = schemaTypes(schema);
  if (types.length === 0 || matchesSchema(value, schema)) {
    return coerceChildren(value, schema, kinds);
  }
  for (const type of types) {
    const converted = convertToType(value, type);
    if (converted !== undefined) {
      kinds.push(converted.kind);
      return coerceChildren(converted.value, schema, kinds);
    }
  }
  return value;
};

/**
 * Repairs the raw input of a tool call by fixing value types against the tool's own JSON schema: numbers sent
 * for string fields, numeric strings for number fields, "true"/"false" for booleans, and JSON text or a lone
 * value for arrays and objects. Integers past the safe range are quoted in the raw text first, so a long id
 * the model sent unquoted keeps every digit instead of becoming a rounded double. Returns null when nothing
 * could be fixed.
 */
export function repairInput(rawInput: string, schema: JSONSchema7) {
  const quoted = quoteLongIntegers(rawInput);
  const parsed = parseJson(quoted);
  if (parsed === undefined) {
    return null;
  }
  const kinds: ToolInputRepairKind[] = quoted === rawInput ? [] : ["long_integer"];
  const input = JSON.stringify(coerce(parsed, schema, kinds));
  if (kinds.length === 0 && input === JSON.stringify(parsed)) {
    return null;
  }
  return { input, kinds };
}

/**
 * Creates the AI SDK tool call repair function. It only runs when the SDK rejected a call as invalid, so a
 * valid call is never touched. onOutcome receives every repaired kind, or an empty list when the call could
 * not be repaired.
 */
export function createToolInputRepair(onOutcome?: (toolName: string, kinds: ToolInputRepairKind[]) => void) {
  const repair: ToolCallRepairFunction<ToolSet> = async ({ toolCall, inputSchema, error }) => {
    if (!InvalidToolInputError.isInstance(error)) {
      return null;
    }
    const schema = await inputSchema({ toolName: toolCall.toolName });
    const repaired = repairInput(toolCall.input, schema);
    onOutcome?.(toolCall.toolName, repaired?.kinds ?? []);
    return repaired === null ? null : { ...toolCall, input: repaired.input };
  };
  return repair;
}
