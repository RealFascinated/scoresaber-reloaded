import type { Page } from "../../../pagination";
import { PlayerScore } from "../../../score/player-score";
import { ScoreSaberScore } from "../../scoresaber/score/score";

export type PlayerScoresPageResponse = Page<PlayerScore<ScoreSaberScore>>;
