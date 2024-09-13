import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { db } from "../../database/database";
import DataFetcher from "../data-fetcher";
import { BeatSaverMap as BSMap } from "../types/beatsaver/beatsaver-map";

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
  async lookupMap(
    query: string,
    useProxy = true,
  ): Promise<BeatSaverMap | undefined> {
    const before = performance.now();
    this.log(`Looking up map "${query}"...`);

    let map = await db.beatSaverMaps.get(query);
    // The map is cached
    if (map != undefined) {
      this.log(
        `Found cached map "${query}" in ${(performance.now() - before).toFixed(0)}ms`,
      );
      return map;
    }

    const response = await this.fetch<BSMap>(
      useProxy,
      LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", query),
    );
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
      fullData: response,
    });
    map = await db.beatSaverMaps.get(query);
    this.log(
      `Found map "${query}" in ${(performance.now() - before).toFixed(0)}ms`,
    );
    return map;
  }
}

export const beatsaverFetcher = new BeatSaverFetcher();
