import { BeatSaverMap } from "../schemas/beatsaver/map/map";
import { BeatSaverMapToken } from "../schemas/beatsaver/tokens/map";
import { BeatSaverMapDifficultyToken } from "../schemas/beatsaver/tokens/map-difficulty";
import { MapCharacteristic } from "../schemas/map/map-characteristic";
import { MapDifficulty } from "../schemas/map/map-difficulty";

export function getBeatSaverMapperProfileUrl(map?: BeatSaverMap) {
  return map != undefined ? `https://beatsaver.com/profile/${map?.author.id}` : undefined;
}

export function getBeatSaverDifficulty(
  map: BeatSaverMapToken,
  hash: string,
  difficulty: MapDifficulty,
  characteristic: MapCharacteristic
): BeatSaverMapDifficultyToken | undefined {
  const version = map.versions.find(v => v.hash === hash);

  return (
    version ??
    map.versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  ).diffs.find(d => d.difficulty === difficulty && d.characteristic === characteristic);
}
