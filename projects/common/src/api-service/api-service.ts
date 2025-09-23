import { Cooldown, CooldownPriority } from "../cooldown";
import Logger from "../logger";
import Request, { RequestOptions } from "../utils/request";
import { isServer } from "../utils/utils";
import { ApiServiceName } from "./api-service-registry";

export const SERVER_PROXIES = [
  "", // No proxy
  "https://proxy.fascinated.cc",
];
export const CLIENT_PROXY = "https://proxy.fascinated.cc";

export default class ApiService {
  /**
   * The cooldown for the service.
   */
  private readonly cooldown: Cooldown;

  /**
   * The name of the service.
   */
  private readonly name: ApiServiceName;

  /**
   * The number of times this service has been called.
   * Only tracked on the server.
   */
  private callCount: number = 0;

  /**
   * The current proxy to use.
   */
  private currentProxy: string = ""; // No proxy by default

  /**
   * The last rate limit seen.
   */
  private lastRateLimitSeen: number | undefined = undefined;

  constructor(cooldown: Cooldown, name: ApiServiceName) {
    this.cooldown = cooldown;
    this.name = name;

    if (name === ApiServiceName.SCORE_SABER) {
      setInterval(() => {
        if (this.lastRateLimitSeen && this.lastRateLimitSeen > 100) {
          // Reset to no proxy
          this.currentProxy = "";
        }
      }, 1000 * 30);
    }
  }

  /**
   * Gets the name of the service.
   *
   * @returns the name of the service
   */
  public getName(): ApiServiceName {
    return this.name;
  }

  /**
   * Gets the current call count.
   */
  public getCallCount(): number {
    return this.callCount;
  }

  /**
   * Logs a message to the console.
   *
   * @param data the data to log
   */
  public log(data: unknown) {
    Logger.debug(`[${this.name.toUpperCase()}] ${data}`);
  }

  /**
   * Builds a request url.
   *
   * @param useProxy whether to use proxy or not
   * @param url the url to fetch
   * @returns the request url
   */
  private buildRequestUrl(url: string): string {
    return (isServer() ? this.currentProxy : CLIENT_PROXY) + url;
  }

  /**
   * Fetches data from the given url.
   *
   * @param url the url to fetch
   * @param options the fetch options to use
   * @returns the fetched data
   */
  public async fetch<T>(
    url: string,
    options?: RequestOptions & { priority?: CooldownPriority }
  ): Promise<T | undefined> {
    await this.cooldown.waitAndUse(options?.priority || CooldownPriority.NORMAL);

    // Increment the call count if we're on the server
    if (isServer()) {
      this.callCount++;
    }

    const response = await Request.executeRequest(this.buildRequestUrl(url), "GET", {
      ...options,
    });

    // Only switch proxies on the server
    const remaining = response?.headers.get("x-ratelimit-remaining");
    if (isServer()) {
      if (remaining && Number(remaining) <= 10) {
        // Get the next proxy in the list
        const nextProxy = SERVER_PROXIES[SERVER_PROXIES.indexOf(this.currentProxy) + 1];
        if (nextProxy) {
          this.currentProxy = nextProxy;
          this.log(`Rate limit exceeded, switching to proxy: ${nextProxy}`);
        }
      }

      // Update the last rate limit seen
      this.lastRateLimitSeen = Number(remaining);
    }

    return response?.json() as Promise<T>;
  }

  /**
   * Fetches data from the given url.
   *
   * @param url the url to fetch
   * @param options the fetch options to use
   * @returns the fetched data
   */
  public async fetchGQL<T>(
    url: string,
    query: string,
    variables: Record<string, any>,
    options?: RequestOptions
  ): Promise<T | undefined> {
    if (isServer()) {
      this.callCount++;
    }

    await this.cooldown.waitAndUse();

    // Increment the call count if we're on the server
    if (isServer()) {
      this.callCount++;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...((options?.headers as Record<string, string>) || {}),
      },
      body: JSON.stringify({
        query: query.trim(),
        variables: variables || {},
      }),
    });

    return response.json() as Promise<T>;
  }

  /**
   * Gets the total number of server proxies.
   *
   * @returns the total number of server proxies
   */
  public static getTotalServerProxies(): number {
    return SERVER_PROXIES.length;
  }
}
