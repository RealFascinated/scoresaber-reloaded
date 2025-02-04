import { AxiosRequestConfig } from "axios";
import { ssrGet } from "src/utils/request";
import { Cooldown } from "../cooldown";
import Logger from "../logger";
import { isServer } from "../utils/utils";

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
   * @param options the fetch options to use
   * @returns the fetched data
   */
  public async fetch<T>(url: string, options?: AxiosRequestConfig): Promise<T | undefined> {
    await this.cooldown.waitAndUse();

    return ssrGet<T>(this.buildRequestUrl(!isServer(), url), "json", {
      ...options,
    });
  }
}
