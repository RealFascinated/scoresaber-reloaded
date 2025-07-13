import { Replay } from "../replay/replay-decoder";

export interface DecodedReplayResponse {
  rawReplay: Replay;
  cutDistribution: {
    score: number;
    count: number;
  }[];
}
