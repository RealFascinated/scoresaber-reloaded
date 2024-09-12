import { db } from "../../database/database";
import DataFetcher from "../data-fetcher";
import { BeatSaverMap } from "../types/beatsaver/beatsaver-map";

const API_BASE = "https://api.beatsaver.com";
const LOOKUP_MAP_BY_HASH_ENDPOINT = `${API_BASE}/maps/hash/:query`;

class BeatSaverFetcher extends DataFetcher {
  constructor() {
    super("BeatSaver");
  }

  /**
   * Gets the map that match the query.
   *
   * @param query the query to search for
   * @param useProxy whether to use the proxy or not
   * @returns the map that match the query, or undefined if no map were found
   */
  async getMapBsr(query: string, useProxy = true): Promise<string | undefined> {
    this.log(`Looking up the bsr for map hash ${query}...`);

    const map = await db.beatSaverMaps.get(query);
    // The map is cached
    if (map != undefined) {
      this.log(`Found cached bsr ${map.bsr} for map hash ${query}`);
      return map.bsr;
    }

    const response = await this.fetch<BeatSaverMap>(useProxy, LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", query));
    // Map not found
    if (response == undefined) {
      return undefined;
    }

    const bsr = response.id;
    if (bsr == undefined) {
      return undefined;
    }

    // Save map the the db
    await db.beatSaverMaps.add({
      hash: query,
      bsr: bsr,
    });
    this.log(`Looked up bsr ${bsr} for map hash ${query}`);
    return bsr;
  }
}

export const beatsaverFetcher = new BeatSaverFetcher();
