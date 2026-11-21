export type RequestErrorType =
  | "not_found"
  | "rate_limited"
  | "server_error"
  | "client_error"
  | "unreachable"
  | "invalid_response";

export type RequestSuccess<T> = {
  ok: true;
  status: number;
  response: T;
};

export type RequestFailure = {
  ok: false;
  status: number | undefined;
  error: RequestErrorType;
  message: string;
};

export type RequestResult<T> = RequestSuccess<T> | RequestFailure;

export function requestFailure(error: RequestErrorType, status: number | undefined, message: string) {
  return { ok: false, status, error, message } satisfies RequestFailure;
}

export function requestFailureFromStatus(status: number, source: string = "The server") {
  if (status === 404) {
    return requestFailure("not_found", status, `${source} returned 404 Not Found`);
  }
  if (status === 429) {
    return requestFailure("rate_limited", status, `${source} rate limited the request`);
  }
  if (status >= 500) {
    return requestFailure("server_error", status, `${source} returned HTTP ${status}`);
  }
  return requestFailure("client_error", status, `${source} returned HTTP ${status}`);
}
