import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberMedalsScore } from "../model/score/impl/scoresaber-medals-score";
import { Page } from "../pagination";
import { PlayerScore } from "../score/player-score";

export type PlayerMedalScoresResponse = Page<
  PlayerScore<ScoreSaberMedalsScore, ScoreSaberLeaderboard>
>;
