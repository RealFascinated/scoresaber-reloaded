import { Cooldown } from "../cooldown";
import Logger from "../logger";
import Request, { RequestOptions } from "../utils/request";
import { isServer } from "../utils/utils";
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
    // Don't log on the backend
    if (!isServer()) {
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
  public async fetch<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    // Increment the call count if we're on the server
    if (isServer()) {
      this.callCount++;
    }

    await this.cooldown.waitAndUse();

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
