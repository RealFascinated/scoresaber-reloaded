import Service from "../service";
import { BeatSaverMapToken } from "../../types/token/beatsaver/map";
import { BeatSaverMultiMapLookup } from "../../types/token/beatsaver/multi-map-lookup";

const API_BASE = "https://api.beatsaver.com";
const LOOKUP_MAP_BY_HASH_ENDPOINT = `${API_BASE}/maps/hash/:query`;

class BeatSaverService extends Service {
  constructor() {
    super("BeatSaver");
  }

  /**
   * Gets the map that match the query.
   *
   * @param hash the query to search for
   * @returns the map that match the query, or undefined if no map were found
   */
  async lookupMap(hash: string): Promise<BeatSaverMapToken | undefined> {
    const before = performance.now();
    this.log(`Looking up map "${hash}"...`);

    const response = await this.fetch<BeatSaverMapToken>(LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", hash));
    // Map not found
    if (response == undefined) {
      return undefined;
    }

    this.log(`Found map "${response.id}" in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Gets the map that match the query.
   *
   * @param hashes the hashes to search for
   * @returns the map that match the query, or undefined if no map were found
   */
  async lookupMaps(hashes: string[]): Promise<BeatSaverMultiMapLookup | undefined> {
    if (hashes.length > 50) {
      throw new Error(`Cannot lookup more than 50 maps at once`);
    }

    const before = performance.now();
    this.log(`Looking up maps "${hashes}"...`);

    const response = await this.fetch<BeatSaverMultiMapLookup>(
      LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", hashes.join(","))
    );
    // Map not found
    if (response == undefined) {
      return undefined;
    }

    this.log(`Found ${Object.entries(response).length} maps in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }
}

export const beatsaverService = new BeatSaverService();
