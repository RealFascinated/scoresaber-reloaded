import ky from "ky";
import { isServer } from "../utils/utils";
import { KyOptions } from "ky/distribution/types/options";
import Logger from "../logger";
import { Cooldown } from "../cooldown";

export default class Service {
  /**
   * The name of the service.
   */
  private readonly name: string;

  /**
   * The cooldown for the service.
   */
  private readonly cooldown: Cooldown;

  constructor(name: string, cooldown: Cooldown) {
    this.name = name;
    this.cooldown = cooldown;
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
   * @param options the ky options to use
   * @returns the fetched data
   */
  public async fetch<T>(url: string, options?: KyOptions): Promise<T | undefined> {
    await this.cooldown.waitAndUse();

    try {
      const response = await ky.get<T>(this.buildRequestUrl(!isServer(), url), options);
      if (response.headers.has("X-RateLimit-Remaining")) {
        const left = Number(response.headers.get("X-RateLimit-Remaining"));
        if (left < 100) {
          Logger.warn(`Rate limit for ${this.name} remaining: ${left}`);
        }
      }

      if (response.headers.get("Content-Type")?.includes("application/json")) {
        return response.json();
      }
      return (await response.text()) as unknown as T;
    } catch (error) {
      return undefined;
    }
  }
}
