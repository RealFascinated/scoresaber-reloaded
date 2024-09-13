import ky from "ky";

export default class DataFetcher {
  /**
   * The name of the leaderboard.
   */
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Logs a message to the console.
   *
   * @param data the data to log
   */
  public log(data: unknown) {
    console.debug(`[${this.name}]: ${data}`);
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
    // return (useProxy ? config.siteUrl + "/api/proxy?url=" : "") + url;
  }

  /**
   * Fetches data from the given url.
   *
   * @param useProxy whether to use proxy or not
   * @param url the url to fetch
   * @returns the fetched data
   */
  public async fetch<T>(
    useProxy: boolean,
    url: string,
  ): Promise<T | undefined> {
    try {
      return await ky
        .get<T>(this.buildRequestUrl(useProxy, url), {
          next: {
            revalidate: 60, // 1 minute
          },
        })
        .json();
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      return undefined;
    }
  }
}
