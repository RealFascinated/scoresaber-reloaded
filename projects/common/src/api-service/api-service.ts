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
  private readonly cooldown: Cooldown;

  private readonly name: ApiServiceName;

  private readonly config: ServiceConfig;

  /**
   * The number of times this service has been called.
   * Only tracked on the server.
   */
  private callCount: number = 0;
  private failedCallCount: number = 0;
  private totalLatencyMs: number = 0;

  private currentProxy: string = ""; // No proxy by default

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
          this.currentProxy = "";
          Logger.info("Switched back to no proxy for api service requests");
        }
      }, 1000 * 30);
    }
  }

  public getName(): ApiServiceName {
    return this.name;
  }

  public getCallCount(): number {
    return this.callCount;
  }

  public getFailedCallCount(): number {
    return this.failedCallCount;
  }

  public getAverageLatencyMs(): number {
    if (this.callCount <= 0) {
      return 0;
    }
    return this.totalLatencyMs / this.callCount;
  }

  public log(data: unknown) {
    Logger.debug(`[${this.name.toUpperCase()}] ${data}`);
  }

  private buildRequestUrl(url: string): string {
    return (isServer() ? (this.config.useProxy ? this.currentProxy : "") : CLIENT_PROXY) + url;
  }

  public async fetch<T>(
    url: string,
    options?: RequestOptions & { priority?: CooldownPriority }
  ): Promise<T | undefined> {
    const startedAt = performance.now();
    await this.cooldown.waitAndUse(options?.priority || CooldownPriority.NORMAL);

    if (isServer()) {
      this.callCount++;
    }

    const response = await Request.executeRequest(this.buildRequestUrl(url), "GET", {
      ...options,
    });
    this.totalLatencyMs += Math.max(0, performance.now() - startedAt);

    const remaining = response?.headers.get("x-ratelimit-remaining");
    if (isServer() && this.config.useProxy) {
      if (remaining && Number(remaining) <= this.config.proxySwitchThreshold) {
        const currentIndex = SERVER_PROXIES.indexOf(this.currentProxy);
        const nextIndex = (currentIndex + 1) % SERVER_PROXIES.length;
        const nextProxy = SERVER_PROXIES[nextIndex];
        this.currentProxy = nextProxy;
        Logger.info(
          `Rate limit exceeded for ${this.name}, switching to another proxy for api service: ${nextProxy}`
        );
      }

      this.lastRateLimitSeen = Number(remaining);
    }

    if (!response) {
      this.failedCallCount++;
      return undefined;
    }

    return response.json() as Promise<T>;
  }

  public static getTotalServerProxies(): number {
    return SERVER_PROXIES.length;
  }
}
