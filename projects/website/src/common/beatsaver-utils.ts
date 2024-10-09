import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { db } from "@/common/database/database";
import { beatsaverService } from "@ssr/common/service/impl/beatsaver";

/**
 * Gets the map that match the query.
 *
 * @param query the query to search for
 * @returns the map that match the query, or undefined if no map were found
 */
export async function lookupBeatSaverMap(query: string): Promise<BeatSaverMap | undefined> {
  let map = await db.beatSaverMaps.get(query);
  // The map is cached
  if (map != undefined) {
    return map;
  }

  const response = await beatsaverService.lookupMap(query);
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
  return map;
}
