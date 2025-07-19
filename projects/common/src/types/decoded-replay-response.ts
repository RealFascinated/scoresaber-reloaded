import { Replay } from "../replay/replay-decoder";

export type CutDistribution = {
  score: number;
  count: number;
};

/**
 * 2 second average swing speed for each hand
 */
export type SwingSpeed = {
  rightSwingSpeed: number[];
  leftSwingSpeed: number[];
};

export interface DecodedReplayResponse {
  rawReplay: Replay;
  cutDistribution: CutDistribution[];
  swingSpeed: SwingSpeed;
  replayLengthSeconds: number;
}
