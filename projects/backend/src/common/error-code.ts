import { InvalidCookie, NotFound, ParseError, ValidationError } from "elysia";

export type HttpErrorCode =
  "VALIDATION" | "NOT_FOUND" | "PARSE" | "INVALID_COOKIE_SIGNATURE" | "INTERNAL_SERVER_ERROR";

/**
 * Elysia 2 no longer passes an error `code` string to `onError` handlers, so derive the
 * legacy code from the error class.
 *
 * @param error the error passed to the `onError` handler
 * @returns the legacy Elysia error code for the error
 */
export function getHttpErrorCode<TError>(error: TError): HttpErrorCode {
  if (error instanceof ValidationError) {
    return "VALIDATION";
  }
  if (error instanceof NotFound) {
    return "NOT_FOUND";
  }
  if (error instanceof ParseError) {
    return "PARSE";
  }
  if (error instanceof InvalidCookie) {
    return "INVALID_COOKIE_SIGNATURE";
  }
  return "INTERNAL_SERVER_ERROR";
}
