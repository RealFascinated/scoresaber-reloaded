import { Cooldown } from "../../cooldown";
import { BeatSaverLatestMapsToken } from "../../types/token/beatsaver/api/latest-maps";
import BeatSaverMapToken from "../../types/token/beatsaver/map";
import { BeatSaverMultiMapLookup } from "../../types/token/beatsaver/multi-map-lookup";
import ApiService from "../api-service";
import { ApiServiceName } from "../api-service-registry";

const API_BASE = "https://api.beatsaver.com";
const LOOKUP_MAP_BY_HASH_ENDPOINT = `${API_BASE}/maps/hash/:query`;
const LOOKUP_LATEST_MAPS_ENDPOINT = `${API_BASE}/maps/latest`;

export class BeatSaverService extends ApiService {
  constructor() {
    // 10 requests per second
    super(new Cooldown(1000 / 10, 10), ApiServiceName.BEAT_SAVER, {
      useProxy: true,
      proxySwitchThreshold: 10,
      proxyResetThreshold: 100,
    });
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

    const response = await this.fetch<BeatSaverMapToken>(
      LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", hash)
    );
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

    this.log(
      `Found ${Object.entries(response).length} maps in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Gets the latest maps.
   *
   * @param automapper the automapper to get the maps from
   * @param pageSize the page size to get the maps from
   * @param sort the sort to get the maps from
   * @returns the latest maps
   */
  async lookupLatestMaps(
    automapper: boolean,
    pageSize: number,
    options?: {
      sort?: "FIRST_PUBLISHED" | "UPDATED" | "LAST_PUBLISHED" | "CREATED" | "CURATED";
      before?: Date;
      after?: Date;
    }
  ): Promise<BeatSaverLatestMapsToken | undefined> {
    const before = performance.now();
    this.log(`Looking up latest maps...`);

    const formatDateForAPI = (date: Date): string => {
      // Format as YYYY-MM-DDTHH:MM:SS+00:00 (no milliseconds, +00:00 instead of Z)
      const isoString = date.toISOString();
      return isoString.replace(/\.\d{3}Z$/, "+00:00");
    };

    const response = await this.fetch<BeatSaverLatestMapsToken>(LOOKUP_LATEST_MAPS_ENDPOINT, {
      searchParams: {
        ...(pageSize ? { pageSize: pageSize } : {}),
        ...(automapper ? { automapper: automapper } : {}),
        ...(options?.sort ? { sort: options.sort } : {}),
        ...(options?.before ? { before: formatDateForAPI(options.before) } : {}),
        ...(options?.after ? { after: formatDateForAPI(options.after) } : {}),
      },
    });
    if (response == undefined) {
      return undefined;
    }

    this.log(`Found ${response.docs.length} maps in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }
}
