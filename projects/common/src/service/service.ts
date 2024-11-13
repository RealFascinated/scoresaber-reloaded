import ky from "ky";
import { isProduction, isServer } from "../utils/utils";
import { KyOptions } from "ky/distribution/types/options";

export default class Service {
  /**
   * The name of the service.
   */
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Logs a message to the console.
   *
   * @param data the data to log
   * @param force log regardless of environment
   */
  public log(data: unknown, force: boolean = false) {
    // Only log in development
    if (!isProduction() || force) {
      console.log(`[${this.name}]: ${data}`);
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
    try {
      const response = await ky.get<T>(this.buildRequestUrl(!isServer(), url), options);
      if (response.headers.has("X-RateLimit-Remaining")) {
        const left = Number(response.headers.get("X-RateLimit-Remaining"));
        this.log(`Rate limit remaining: ${left}`, left < 100);
      }
      return response.json();
    } catch (error) {
      return undefined;
    }
  }
}
