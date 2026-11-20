import type { ChatToolErrorCode, ChatToolErrorPayload } from "@ssr/common/schemas/chat/tools/tool-error";
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
        error: new Error(
          `Invalid tool input${location}: ${firstError.message}. Ids and hashes are strings, wrap them in quotes.`
        ),
      };
    },
  });
}

/**
 * A tool failure with a message that is safe to show to the user and the model. The message is the JSON of
 * code, message, retryable and hint, so the model can decide whether to retry or change its arguments.
 */
export class ChatToolError extends Error {
  constructor(
    readonly code: ChatToolErrorCode,
    reason: string,
    hint?: string,
    options?: { cause: Error }
  ) {
    const payload = {
      code,
      message: reason,
      retryable: code === "unavailable",
      ...(hint === undefined ? {} : { hint }),
    } satisfies ChatToolErrorPayload;
    super(JSON.stringify(payload), options);
    this.name = "ChatToolError";
  }
}

/**
 * Runs a tool action and rethrows any unexpected error as a sanitized, retryable ChatToolError that keeps the
 * original error as its cause for server-side logging.
 */
export async function runTool<TResult>(
  action: () => Promise<TResult>,
  errorMessage: string = "The tool failed."
) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ChatToolError) {
      throw error;
    }
    throw new ChatToolError(
      "unavailable",
      errorMessage,
      "This may be temporary: retry once, and if it fails again tell the user instead of retrying further.",
      { cause: error instanceof Error ? error : new Error(String(error)) }
    );
  }
}
