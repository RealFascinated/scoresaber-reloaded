import { CooldownPriority } from "../cooldown";
import { RateLimitError } from "../error/rate-limit-error";
import Logger from "../logger";
import { formatDate } from "./time-utils";

type RequestReturns = "text" | "json" | "arraybuffer";

type BaseRequestOptions = {
  next?: {
    revalidate?: number;
  };
  searchParams?: Record<string, unknown>;
  throwOnError?: boolean;
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
    if (!searchParams) return baseUrl;

    const params = new URLSearchParams(
      Object.entries(searchParams).map(([key, value]) => [key, String(value)])
    );
    return `${baseUrl}?${params.toString()}`;
  }

  private static async handleRateLimit(
    url: string,
    response: Response,
    priority: CooldownPriority
  ): Promise<void> {
    const rateLimit = response.headers.get("x-ratelimit-remaining");
    const resetTime = response.headers.get("x-ratelimit-reset");

    if (rateLimit) {
      const remaining = Number(rateLimit);

      // Update rate limit info
      this.rateLimitInfo.set(url, {
        remaining,
        resetTime: resetTime ? Number(resetTime) : Date.now() + 60_000,
      });

      // Log warning if below threshold
      if (remaining <= 50) {
        Logger.warn(
          `The rate limit for ${url} is low (${remaining} remaining). ${
            resetTime
              ? `Reset date: ${formatDate(new Date(Number(resetTime) * 1000), "DD/MM/YYYY, HH:mm:ss")}.`
              : ""
          }`
        );
      }

      if (remaining === 0) {
        throw new RateLimitError("Rate limit exceeded");
      }
    }
  }

  private static async executeRequest<T>(
    url: string,
    method: string,
    options?: RequestOptions
  ): Promise<T | undefined> {
    const {
      searchParams,
      returns = "json",
      throwOnError = false,
      priority = CooldownPriority.NORMAL,
      ...fetchOptions
    } = options || {};
    const fullUrl = this.buildUrl(url, searchParams);
    const cacheKey = this.getCacheKey(fullUrl, method, options);

    // Check if there's a pending request for this URL
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest as Promise<T | undefined>;
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const response = await fetch(fullUrl, {
          method,
          ...fetchOptions,
        });

        // Handle rate limits
        await this.handleRateLimit(url, response, priority);

        if (!response.ok) {
          if (throwOnError) {
            throw new Error(response.statusText);
          }
          return undefined;
        }

        switch (returns) {
          case "text":
            return response.text() as Promise<T>;
          case "json":
            return response.json() as Promise<T>;
          case "arraybuffer":
            return response.arrayBuffer() as Promise<T>;
          default:
            return response.json() as Promise<T>;
        }
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  public static async get<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    return this.executeRequest<T>(url, "GET", options);
  }

  public static async post<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    return this.executeRequest<T>(url, "POST", options);
  }

  public static async put<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    return this.executeRequest<T>(url, "PUT", options);
  }

  public static async delete<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    return this.executeRequest<T>(url, "DELETE", options);
  }
}

// Export the public API
export default {
  get: Request.get.bind(Request),
  post: Request.post.bind(Request),
  put: Request.put.bind(Request),
  delete: Request.delete.bind(Request),
};
