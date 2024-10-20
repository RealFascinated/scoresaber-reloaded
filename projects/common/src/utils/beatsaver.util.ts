import { BeatSaverMap } from "../model/beatsaver/beatsaver-map";

/**
 * Gets the beatSaver mapper profile url.
 *
 * @param map the beatsaver map
 * @returns the beatsaver mapper profile url
 */
export function getBeatSaverMapperProfileUrl(map?: BeatSaverMap) {
  return map != undefined ? `https://beatsaver.com/profile/${map?.author.id}` : undefined;
}
