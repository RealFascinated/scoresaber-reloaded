import { Cooldown, CooldownPriority } from "../cooldown";
import Logger from "../logger";
import { CLIENT_PROXY, SERVER_PROXIES } from "../shared-consts";
import Request, { RequestOptions } from "../utils/request";
import { isServer } from "../utils/utils";
import { ApiServiceName } from "./api-service-registry";

export interface ServiceConfig {
  useProxy: boolean;
  proxySwitchThreshold: number;
  proxyResetThreshold: number;
}

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
   * The configuration for the service.
   */
  private readonly config: ServiceConfig;

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

  constructor(cooldown: Cooldown, name: ApiServiceName, config: ServiceConfig) {
    this.cooldown = cooldown;
    this.name = name;
    this.config = config;

    if (config.useProxy) {
      setInterval(() => {
        if (
          this.lastRateLimitSeen &&
          this.lastRateLimitSeen > config.proxyResetThreshold &&
          this.currentProxy !== "" // Already not using a proxy
        ) {
          // Reset to no proxy
          this.currentProxy = "";
          Logger.info("Switched back to no proxy for api service requests");
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
   * @param url the url to fetch
   * @returns the request url
   */
  private buildRequestUrl(url: string): string {
    return (isServer() ? (this.config.useProxy ? this.currentProxy : "") : CLIENT_PROXY) + url;
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

    // Handle rate limit errors
    const remaining = response?.headers.get("x-ratelimit-remaining");
    if (isServer() && this.config.useProxy) {
      if (remaining && Number(remaining) <= this.config.proxySwitchThreshold) {
        // Get the next proxy in the list (circular)
        const currentIndex = SERVER_PROXIES.indexOf(this.currentProxy);
        const nextIndex = (currentIndex + 1) % SERVER_PROXIES.length;
        const nextProxy = SERVER_PROXIES[nextIndex];
        this.currentProxy = nextProxy;
        Logger.info(
          `Rate limit exceeded for ${this.name}, switching to another proxy for api service: ${nextProxy}`
        );
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
