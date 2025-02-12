import { BeatLeaderModifierRatingToken } from "./modifier/modifier-rating";
import { BeatLeaderModifierToken } from "./modifier/modifiers";

export type BeatLeaderDifficultyToken = {
  id: number;
  value: number;
  mode: number;
  difficultyName: string;
  modeName: string;
  status: number;
  modifierValues: BeatLeaderModifierToken;
  modifiersRating: BeatLeaderModifierRatingToken;
  nominatedTime: number;
  qualifiedTime: number;
  rankedTime: number;
  stars: number;
  predictedAcc: number;
  passRating: number;
  accRating: number;
  techRating: number;
  type: number;
  njs: number;
  nps: number;
  notes: number;
  bombs: number;
  walls: number;
  maxScore: number;
  duration: number;
  requirements: number;
};
