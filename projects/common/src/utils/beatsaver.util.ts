import { BeatSaverMap } from "../model/beatsaver/map";
import BeatSaverMapDifficulty from "../model/beatsaver/map-difficulty";
import { BeatSaverMapResponse } from "../response/beatsaver-map-response";
import { MapDifficulty } from "../score/map-difficulty";
import { MapCharacteristic } from "../types/map-characteristic";

/**
 * Gets the BeatSaver mapper profile url.
 *
 * @param map the beatsaver map
 * @returns the beatsaver mapper profile url
 */
export function getBeatSaverMapperProfileUrl(map?: BeatSaverMapResponse) {
  return map != undefined ? `https://beatsaver.com/profile/${map?.author.id}` : undefined;
}

/**
 * Gets a BeatSaver difficulty from a map.
 *
 * @param map the map to get the difficulty from
 * @param hash the hash of the map
 * @param difficulty the difficulty to get
 * @param characteristic the characteristic to get
 */
export function getBeatSaverDifficulty(
  map: BeatSaverMap,
  hash: string,
  difficulty: MapDifficulty,
  characteristic: MapCharacteristic
): BeatSaverMapDifficulty | undefined {
  const version = map.versions.find(v => v.hash === hash);

  // Fallback to the latest version if the version is undefined
  return (
    version ?? map.versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
  ).difficulties.find(d => d.difficulty === difficulty && d.characteristic === characteristic);
}
