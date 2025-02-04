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
  const searchParams = options?.searchParams;
  if (searchParams) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(searchParams).map(([key, value]) => [key, String(value)]))
    );
    url = `${url}?${params.toString()}`;
  }

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
  }
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
