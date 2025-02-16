import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";

export type PlayerRankedPpsResponse = {
  scores: Pick<ScoreSaberScore, "pp" | "weight" | "scoreId">[];
};
