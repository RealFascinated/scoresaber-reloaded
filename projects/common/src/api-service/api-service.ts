import { Cooldown, CooldownPriority } from "../cooldown";
import Logger from "../logger";
import { CLIENT_PROXY, SERVER_PROXIES } from "../shared-consts";
import Request, { RequestOptions } from "../utils/request";
import { type RequestResult, requestFailure } from "../utils/request-result";
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

  private async executeTracked(url: string, options?: RequestOptions & { priority?: CooldownPriority }) {
    const startedAt = performance.now();
    await this.cooldown.waitAndUse(options?.priority || CooldownPriority.NORMAL);

    if (isServer()) {
      this.callCount++;
    }

    const result = await Request.executeRequest(this.buildRequestUrl(url), "GET", {
      ...options,
    });
    this.totalLatencyMs += Math.max(0, performance.now() - startedAt);

    const remaining = result.ok ? result.response.headers.get("x-ratelimit-remaining") : null;
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

    if (!result.ok) {
      this.failedCallCount++;
    }
    return result;
  }

  public async fetch<T>(
    url: string,
    options?: RequestOptions & { priority?: CooldownPriority }
  ): Promise<RequestResult<T>> {
    const result = await this.executeTracked(url, options);
    if (!result.ok) {
      return result;
    }
    try {
      return { ok: true, status: result.status, response: (await result.response.json()) as T };
    } catch (error) {
      this.failedCallCount++;
      return requestFailure(
        "invalid_response",
        result.status,
        `${this.name} returned a body that is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  public static getTotalServerProxies(): number {
    return SERVER_PROXIES.length;
  }
}
