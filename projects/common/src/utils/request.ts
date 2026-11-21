import { CooldownPriority } from "../cooldown";
import { type RequestResult, requestFailure, requestFailureFromStatus } from "./request-result";

type RequestReturns = "text" | "json" | "arraybuffer";

type BaseRequestOptions = {
  next?: {
    revalidate?: number;
  };
  searchParams?: Record<string, unknown>;
  returns?: RequestReturns;
  priority?: CooldownPriority;
};

export type RequestOptions = Omit<RequestInit, "priority"> & BaseRequestOptions;

class Request {
  private static pendingRequests = new Map<string, Promise<unknown>>();
  private static rateLimitInfo = new Map<string, { remaining: number; resetTime: number }>();

  private static getCacheKey(url: string, method: string, options?: RequestOptions): string {
    return JSON.stringify({ url, method, options });
  }

  private static buildUrl(baseUrl: string, searchParams?: Record<string, unknown>): string {
    if (!searchParams) {
      return baseUrl;
    }

    const params = new URLSearchParams(
      Object.entries(searchParams).map(([key, value]) => [key, String(value)])
    );
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${params.toString()}`;
  }

  private static recordRateLimit(url: string, response: Response) {
    const rateLimit = response.headers.get("x-ratelimit-remaining");
    const resetTime = response.headers.get("x-ratelimit-reset");

    if (rateLimit) {
      this.rateLimitInfo.set(url, {
        remaining: Number(rateLimit),
        resetTime: resetTime ? Number(resetTime) : Date.now() + 60_000,
      });
    }
  }

  public static async executeRequest(
    url: string,
    method: string,
    options?: RequestOptions
  ): Promise<RequestResult<Response>> {
    const { searchParams, returns: _returns, priority: _priority, ...fetchOptions } = options || {};
    const fullUrl = this.buildUrl(url, searchParams);
    const cacheKey = this.getCacheKey(fullUrl, method, options);

    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      const shared = (await pendingRequest) as RequestResult<Response>;
      return shared.ok ? { ...shared, response: shared.response.clone() } : shared;
    }

    const requestPromise = (async (): Promise<RequestResult<Response>> => {
      try {
        let response: Response;
        try {
          response = await fetch(fullUrl, { method, ...fetchOptions });
        } catch (error) {
          return requestFailure(
            "unreachable",
            undefined,
            `Request ${fullUrl} failed: ${error instanceof Error ? error.message : "network error"}`
          );
        }

        this.recordRateLimit(url, response);

        if (!response.ok) {
          return requestFailureFromStatus(response.status, fullUrl);
        }

        return { ok: true, status: response.status, response } satisfies RequestResult<Response>;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private static async handleResponse<T>(
    result: RequestResult<Response>,
    returns: RequestReturns
  ): Promise<RequestResult<T>> {
    if (!result.ok) {
      return result;
    }
    try {
      const body =
        returns === "text"
          ? await result.response.text()
          : returns === "arraybuffer"
            ? await result.response.arrayBuffer()
            : await result.response.json();
      return { ok: true, status: result.status, response: body as T } satisfies RequestResult<T>;
    } catch (error) {
      return requestFailure(
        "invalid_response",
        result.status,
        `Response body could not be read as ${returns}: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  public static async get<T>(url: string, options?: RequestOptions) {
    const result = await this.executeRequest(url, "GET", options);
    return this.handleResponse<T>(result, options?.returns || "json");
  }

  public static async post<T>(url: string, options?: RequestOptions) {
    const result = await this.executeRequest(url, "POST", options);
    return this.handleResponse<T>(result, options?.returns || "json");
  }

  public static async put<T>(url: string, options?: RequestOptions) {
    const result = await this.executeRequest(url, "PUT", options);
    return this.handleResponse<T>(result, options?.returns || "json");
  }

  public static async delete<T>(url: string, options?: RequestOptions) {
    const result = await this.executeRequest(url, "DELETE", options);
    return this.handleResponse<T>(result, options?.returns || "json");
  }
}

export default {
  get: Request.get.bind(Request),
  post: Request.post.bind(Request),
  put: Request.put.bind(Request),
  delete: Request.delete.bind(Request),
  executeRequest: Request.executeRequest.bind(Request),
};
