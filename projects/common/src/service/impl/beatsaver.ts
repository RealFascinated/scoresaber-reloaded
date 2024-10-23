import Service from "../service";
import { BeatSaverMapToken } from "../../types/token/beatsaver/map";

const API_BASE = "https://api.beatsaver.com";
const LOOKUP_MAP_BY_HASH_ENDPOINT = `${API_BASE}/maps/hash/:query`;

class BeatSaverService extends Service {
  constructor() {
    super("BeatSaver");
  }

  /**
   * Gets the map that match the query.
   *
   * @param query the query to search for
   * @returns the map that match the query, or undefined if no map were found
   */
  async lookupMap(query: string): Promise<BeatSaverMapToken | undefined> {
    const before = performance.now();
    this.log(`Looking up map "${query}"...`);

    const response = await this.fetch<BeatSaverMapToken>(LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", query));
    // Map not found
    if (response == undefined) {
      return undefined;
    }

    this.log(`Found map "${response.id}" in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }
}

export const beatsaverService = new BeatSaverService();
