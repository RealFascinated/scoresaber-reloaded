import { MapCharacteristic } from "../schemas/map/map-characteristic";
import { MapDifficulty, MapDifficultySchema } from "../schemas/map/map-difficulty";

/**
 * Validates a map difficulty and characteristic
 *
 * @param difficulty the difficulty to validate
 * @param characteristic the characteristic to validate
 */
export function validateMap(difficulty: MapDifficulty, characteristic: MapCharacteristic): void {
  // Validate the difficulty
  if (!MapDifficultySchema.parse(difficulty, { reportInput: true })) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }
  // todo: look into this more
  // // Validate the characteristic
  // if (!MapCharacteristicSchema.parse(characteristic)) {
  //   throw new Error(`Invalid characteristic: ${characteristic}`);
  // }
}
