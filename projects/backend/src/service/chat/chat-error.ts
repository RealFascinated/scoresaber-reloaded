import { APICallError } from "ai";

/**
 * Describes a provider error by its message and status code only, the full error carries the user prompts.
 */
export function describeChatError(error: Error) {
  if (APICallError.isInstance(error) && error.statusCode !== undefined) {
    return `${error.message} (status ${error.statusCode})`;
  }
  return error.message;
}
