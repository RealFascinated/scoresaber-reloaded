import { jsonSchema } from "ai";
import type { StaticDecode, TSchema } from "typebox";
import { Value } from "typebox/value";

/**
 * Wraps a TypeBox input schema in the AI SDK schema shape, validating every tool call at runtime.
 */
export function toolSchema<const Schema extends TSchema>(schema: Schema) {
  return jsonSchema<StaticDecode<Schema>>(schema, {
    validate: value => {
      const [firstError] = Value.Errors(schema, value);
      if (firstError === undefined) {
        return { success: true, value: value as StaticDecode<Schema> };
      }
      const location = firstError.instancePath.length > 0 ? ` at ${firstError.instancePath}` : "";
      return {
        success: false,
        error: new Error(`Invalid tool input${location}: ${firstError.message}`),
      };
    },
  });
}

/**
 * Runs a tool action and converts any thrown error into a short, sanitized tool result.
 */
export async function runTool<TResult>(
  action: () => Promise<TResult>,
  errorMessage: string = "The tool failed."
) {
  try {
    return await action();
  } catch {
    return { error: errorMessage };
  }
}
