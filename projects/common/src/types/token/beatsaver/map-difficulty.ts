import type { MapCharacteristic } from "../../../schemas/map/map-characteristic";
import type { MapDifficulty } from "../../../schemas/map/map-difficulty";
import type MapDifficultyParitySummaryToken from "./difficulty-parity-summary";

export default interface BeatSaverMapDifficultyToken {
  njs: number;
  offset: number;
  notes: number;
  bombs: number;
  obstacles: number;
  nps: number;
  length: number;
  characteristic: MapCharacteristic;
  difficulty: MapDifficulty;
  events: number;
  chroma: boolean;
  me: boolean;
  ne: boolean;
  cinema: boolean;
  seconds: number;
  paritySummary: MapDifficultyParitySummaryToken;
  maxScore: number;
  label: string;
  blStars?: number;
  stars?: number;
  environment?: string;
  vivify?: boolean;
}
