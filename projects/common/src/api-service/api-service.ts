import { Cooldown, CooldownPriority } from "../cooldown";
import Logger from "../logger";
import Request, { RequestOptions } from "../utils/request";
import { isProduction, isServer } from "../utils/utils";
import { ApiServiceName } from "./api-service-registry";

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

  constructor(cooldown: Cooldown, name: ApiServiceName) {
    this.cooldown = cooldown;
    this.name = name;
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
    // Don't log on the backend, but always log in development
    if (!isServer() || !isProduction()) {
      Logger.info(`${data}`);
    }
  }

  /**
   * Builds a request url.
   *
   * @param useProxy whether to use proxy or not
   * @param url the url to fetch
   * @returns the request url
   */
  private buildRequestUrl(useProxy: boolean, url: string): string {
    return (useProxy ? "https://proxy.fascinated.cc/" : "") + url;
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
    // Adjust cooldown based on priority
    const priority = options?.priority || CooldownPriority.NORMAL;
    let cooldownMultiplier = 1; // normal speed
    if (priority === CooldownPriority.HIGH) {
      cooldownMultiplier = 0.5; // 2x faster than normal
    } else if (priority === CooldownPriority.LOW) {
      cooldownMultiplier = 2; // 2x slower than normal
    } else if (priority === CooldownPriority.BACKGROUND) {
      cooldownMultiplier = 10; // 10x slower than normal
    }

    await this.cooldown.waitAndUse(cooldownMultiplier);

    // Increment the call count if we're on the server
    if (isServer()) {
      this.callCount++;
    }

    return Request.get<T>(this.buildRequestUrl(!isServer(), url), {
      returns: "json",
      ...options,
    });
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
}
