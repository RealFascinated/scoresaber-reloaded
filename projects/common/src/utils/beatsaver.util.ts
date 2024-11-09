import {BeatSaverMap} from "../model/beatsaver/map";
import {MapDifficulty} from "../score/map-difficulty";
import {MapCharacteristic} from "../types/map-characteristic";

/**
 * Gets the BeatSaver mapper profile url.
 *
 * @param map the beatsaver map
 * @returns the beatsaver mapper profile url
 */
export function getBeatSaverMapperProfileUrl(map?: BeatSaverMap) {
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
) {
  const version = map.versions.find(v => v.hash === hash);
  if (version == undefined) {
    return undefined;
  }
  return version.difficulties.find(d => d.difficulty === difficulty && d.characteristic === characteristic);
}
