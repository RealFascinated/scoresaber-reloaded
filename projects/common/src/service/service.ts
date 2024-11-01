import ky from "ky";
import { isServer } from "../utils/utils";

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
   */
  public log(data: unknown) {
    console.log(`[${this.name}]: ${data}`);
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
   * @returns the fetched data
   */
  public async fetch<T>(url: string): Promise<T | undefined> {
    try {
      const response = await ky.get<T>(this.buildRequestUrl(!isServer(), url));
      if (response.headers.has("X-RateLimit-Remaining")) {
        this.log(`Rate limit remaining: ${response.headers.get("X-RateLimit-Remaining")}`);
      }
      return response.json();
    } catch (error) {
      return undefined;
    }
  }
}
