import Logger from "../logger";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

// Types and Interfaces
export enum RequestPriority {
  BACKGROUND = 0,
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
}

type RequestReturns = "text" | "json" | "arraybuffer";

export type RequestOptions = AxiosRequestConfig & {
  next?: {
    revalidate?: number;
  };
  searchParams?: Record<string, unknown>;
  throwOnError?: boolean;
  returns?: RequestReturns;
  priority?: RequestPriority;
};

const DEBUG = false;
const DEFAULT_OPTIONS: RequestOptions = {
  next: {
    revalidate: 120, // 2 minutes
  },
  throwOnError: false,
  returns: "json",
  priority: RequestPriority.NORMAL,
};

// Request Management
class RequestManager {
  private static pendingRequests = new Map<string, Promise<unknown>>();
  private static requestQueue = new Map<RequestPriority, Promise<unknown>[]>();

  static {
    // Initialize queue for each priority level
    Object.values(RequestPriority).forEach(priority => {
      if (typeof priority === "number") {
        this.requestQueue.set(priority, []);
      }
    });
  }

  private static getCacheKey(url: string, method: string, options?: RequestOptions): string {
    return JSON.stringify({ url, method, options });
  }

  private static getPriorityName(priority: RequestPriority): string {
    const names: Record<RequestPriority, string> = {
      [RequestPriority.BACKGROUND]: "background",
      [RequestPriority.LOW]: "low",
      [RequestPriority.NORMAL]: "normal",
      [RequestPriority.HIGH]: "high",
    };
    return names[priority];
  }

  private static async processRequest<T>(
    priority: RequestPriority,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const higherPriorityQueues = Array.from(this.requestQueue.entries())
      .filter(([queuePriority]) => queuePriority >= priority)
      .map(([_, queue]) => queue);

    // Wait for higher priority requests
    await new Promise<void>(resolve => {
      if (higherPriorityQueues.every(queue => queue.length === 0)) {
        resolve();
      } else {
        Promise.all(higherPriorityQueues.flat()).finally(() => resolve());
      }
    });

    const queue = this.requestQueue.get(priority) ?? [];
    const requestPromise = requestFn();
    queue.push(requestPromise);
    this.requestQueue.set(priority, queue);

    try {
      return await requestPromise;
    } finally {
      const index = queue.indexOf(requestPromise);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }
  }

  private static buildUrl(baseUrl: string, searchParams?: Record<string, unknown>): string {
    if (!searchParams) return baseUrl;

    const params = new URLSearchParams(
      Object.entries(searchParams).map(([key, value]) => [key, String(value)])
    );
    return `${baseUrl}?${params.toString()}`;
  }

  private static async executeRequest<T>(
    url: string,
    method: "GET" | "POST",
    options: RequestOptions
  ): Promise<T | undefined> {
    try {
      const response: AxiosResponse = await axios({
        url,
        method,
        ...options,
        responseType: options.returns,
      });

      this.checkRateLimit(url, response);
      return response.data as T;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (options.throwOnError) {
          throw new Error(`Failed to request ${url}`, { cause: error.response });
        }
        return undefined;
      }
      throw error;
    }
  }

  private static checkRateLimit(url: string, response: AxiosResponse): void {
    const rateLimit = response.headers["x-ratelimit-remaining"];
    if (rateLimit) {
      const remaining = Number(rateLimit);
      if (remaining < 100) {
        Logger.warn(`Rate limit for ${url} remaining: ${remaining}`);
      }
    }
  }

  static async send<T>(
    url: string,
    method: "GET" | "POST",
    options?: RequestOptions
  ): Promise<T | undefined> {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    const priority = finalOptions.priority!;
    const finalUrl = this.buildUrl(url, finalOptions.searchParams);
    const cacheKey = this.getCacheKey(finalUrl, method, finalOptions);

    if (DEBUG) {
      Logger.info(`Sending request: ${finalUrl} with priority ${this.getPriorityName(priority)}`);
    }

    // Check for pending requests
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest as Promise<T | undefined>;
    }

    const requestPromise = this.processRequest(priority, () =>
      this.executeRequest<T>(finalUrl, method, finalOptions)
    );

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      if (DEBUG) {
        Logger.info(
          `Request completed: ${finalUrl} with priority ${this.getPriorityName(priority)}`
        );
      }
      this.pendingRequests.delete(cacheKey);
    }
  }

  static async get<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    return this.send<T>(url, "GET", options);
  }

  static async post<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    return this.send<T>(url, "POST", options);
  }
}

// Export the public API
export default {
  send: RequestManager.send.bind(RequestManager),
  get: RequestManager.get.bind(RequestManager),
  post: RequestManager.post.bind(RequestManager),
};
