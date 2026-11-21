import { Cooldown } from "../../cooldown";
import { BeatSaverLatestMapsToken } from "../../schemas/beatsaver/tokens/api/latest-maps";
import { BeatSaverMultiMapLookup } from "../../schemas/beatsaver/tokens/api/multi-map-lookup";
import { BeatSaverMapToken } from "../../schemas/beatsaver/tokens/map";
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

  async lookupMap(hash: string) {
    const before = performance.now();
    this.log(`Looking up map "${hash}"...`);

    const result = await this.fetch<BeatSaverMapToken>(LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", hash));
    if (result.ok) {
      this.log(`Found map "${result.response.id}" in ${(performance.now() - before).toFixed(0)}ms`);
    }
    return result;
  }

  /**
   * Looks up a map by hash, telling a map BeatSaver does not have (404) apart from a failed request.
   */
  async lookupMapResult(hash: string) {
    const result = await this.fetch<BeatSaverMapToken>(LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", hash));
    if (!result.ok) {
      return result.error === "not_found" ? ({ status: "missing" } as const) : ({ status: "error" } as const);
    }
    if (!Array.isArray(result.response?.versions)) {
      return { status: "missing" } as const;
    }
    return { status: "found", map: result.response } as const;
  }

  /**
   * Gets the map that match the query.
   */
  async lookupMaps(hashes: string[]) {
    if (hashes.length > 50) {
      throw new Error(`Cannot lookup more than 50 maps at once`);
    }

    const before = performance.now();
    this.log(`Looking up maps "${hashes}"...`);

    const result = await this.fetch<BeatSaverMultiMapLookup>(
      LOOKUP_MAP_BY_HASH_ENDPOINT.replace(":query", hashes.join(","))
    );
    if (result.ok) {
      this.log(
        `Found ${Object.entries(result.response).length} maps in ${(performance.now() - before).toFixed(0)}ms`
      );
    }
    return result;
  }

  /**
   * Gets the latest maps.
   */
  async lookupLatestMaps(
    automapper: boolean,
    pageSize: number,
    options?: {
      sort?: "FIRST_PUBLISHED" | "UPDATED" | "LAST_PUBLISHED" | "CREATED" | "CURATED";
      before?: Date;
      after?: Date;
    }
  ) {
    const before = performance.now();
    this.log(`Looking up latest maps...`);

    const formatDateForAPI = (date: Date): string => {
      // Format as YYYY-MM-DDTHH:MM:SS+00:00 (no milliseconds, +00:00 instead of Z)
      const isoString = date.toISOString();
      return isoString.replace(/\.\d{3}Z$/, "+00:00");
    };

    const result = await this.fetch<BeatSaverLatestMapsToken>(LOOKUP_LATEST_MAPS_ENDPOINT, {
      searchParams: {
        ...(pageSize ? { pageSize: pageSize } : {}),
        ...(automapper ? { automapper: automapper } : {}),
        ...(options?.sort ? { sort: options.sort } : {}),
        ...(options?.before ? { before: formatDateForAPI(options.before) } : {}),
        ...(options?.after ? { after: formatDateForAPI(options.after) } : {}),
      },
    });
    if (result.ok) {
      this.log(`Found ${result.response.docs.length} maps in ${(performance.now() - before).toFixed(0)}ms`);
    }
    return result;
  }
}
