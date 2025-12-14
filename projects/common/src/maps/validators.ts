import { MapDifficultySchema } from "../score/map-difficulty";
import { MapCharacteristicSchema } from "../types/map-characteristic";
import { MapDifficulty } from "../score/map-difficulty";
import { MapCharacteristic } from "../types/map-characteristic";

/**
 * Validates a map difficulty and characteristic
 * 
 * @param difficulty the difficulty to validate
 * @param characteristic the characteristic to validate
 */
export function validateMap(difficulty: MapDifficulty, characteristic: MapCharacteristic): void {
  // Validate the difficulty
  if (!MapDifficultySchema.parse(difficulty)) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }
  // Validate the characteristic
  if (!MapCharacteristicSchema.parse(characteristic)) {
    throw new Error(`Invalid characteristic: ${characteristic}`);
  }
}