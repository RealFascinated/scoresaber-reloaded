import { Cooldown } from "../cooldown";
import Logger from "../logger";
import RequestManager, { RequestOptions } from "../utils/request";
import { isServer } from "../utils/utils";

export default class Service {
  /**
   * The cooldown for the service.
   */
  private readonly cooldown: Cooldown;

  constructor(cooldown: Cooldown) {
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
   * @param options the fetch options to use
   * @returns the fetched data
   */
  public async fetch<T>(url: string, options?: RequestOptions): Promise<T | undefined> {
    await this.cooldown.waitAndUse();

    return RequestManager.get<T>(this.buildRequestUrl(!isServer(), url), {
      returns: "json",
      ...options,
    });
  }
}
