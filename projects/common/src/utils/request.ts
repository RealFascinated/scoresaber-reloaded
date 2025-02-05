import Logger from "../logger";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

type RequestReturns = "text" | "json" | "arraybuffer";
export type RequestOptions = AxiosRequestConfig & {
  next?: {
    revalidate?: number;
  };
  searchParams?: Record<string, unknown>;
  throwOnError?: boolean;
};

const defaultRequestOptions: RequestOptions = {
  next: {
    revalidate: 120, // 2 minutes
  },
  throwOnError: false,
};

const DEBUG_DEDUPE = false;
const pendingRequests = new Map<string, Promise<unknown>>();

const getCacheKey = (url: string, method: string, options?: RequestOptions): string => {
  return JSON.stringify({ url, method, options });
};

/**
 * Requests data from an endpoint.
 *
 * @param url the url to send the request to
 * @param method the method to use
 * @param returns the expected return type
 * @param options the options to use
 */
async function ssrRequest<T>(
  url: string,
  method: "GET" | "POST",
  returns: RequestReturns,
  options?: RequestOptions
): Promise<T | undefined> {
  const cacheKey = getCacheKey(url, method, options);

  // Check if there's already a pending request
  const pendingRequest = pendingRequests.get(cacheKey);
  if (pendingRequest) {
    if (DEBUG_DEDUPE) {
      Logger.info(`Request deduped: ${url}`);
    }
    return pendingRequest as Promise<T | undefined>;
  }

  if (DEBUG_DEDUPE) {
    Logger.info(`New request: ${url} (${pendingRequests.size} pending requests)`);
  }

  const searchParams = options?.searchParams;
  if (searchParams) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(searchParams).map(([key, value]) => [key, String(value)]))
    );
    url = `${url}?${params.toString()}`;
  }

  // Create the request promise
  const requestPromise = (async () => {
    try {
      const response: AxiosResponse = await axios({
        url,
        method,
        ...defaultRequestOptions,
        ...options,
        responseType: returns,
      });

      // Check rate limits
      const rateLimit = response.headers["x-ratelimit-remaining"];
      if (rateLimit) {
        const left = Number(rateLimit);
        if (left < 100) {
          Logger.warn(`Rate limit for ${url} remaining: ${left}`);
        }
      }

      // Handle different response types
      return response.data as unknown as T;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (options?.throwOnError) {
          throw new Error(`Failed to request ${url}`, { cause: error.response });
        }
        return undefined;
      }
      throw error;
    } finally {
      // Remove the request from the cache once it's complete
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store the promise in the cache
  pendingRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * Gets data from an endpoint.

 *
 * @param url the url to get data from
 * @param options the options to use
 */
export async function ssrGet<T>(
  url: string,
  returns: RequestReturns = "json",
  options?: RequestOptions
): Promise<T | undefined> {
  return ssrRequest<T>(url, "GET", returns, options);
}

/**
 * Posts data to an endpoint.
 *
 * @param url the url to post data to
 * @param options the options to use
 */
export async function ssrPost<T>(
  url: string,
  returns: RequestReturns = "json",
  options?: RequestOptions
): Promise<T | undefined> {
  return ssrRequest<T>(url, "POST", returns, options);
}
