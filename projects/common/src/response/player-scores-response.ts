import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { Page } from "../pagination";
import { PlayerScore } from "../score/player-score";

export type PlayerScoresResponse = Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>;
