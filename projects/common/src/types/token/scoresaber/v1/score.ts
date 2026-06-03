import ScoreSaberLeaderboardToken from "./leaderboard";
import { ScoreSaberLeaderboardPlayerInfoToken } from "./leaderboard-player-info";

export default interface ScoreSaberScoreToken {
  id: string;
  leaderboardPlayerInfo: ScoreSaberLeaderboardPlayerInfoToken;
  rank: number;
  baseScore: number;
  modifiedScore: number;
  pp: number;
  weight: number;
  modifiers: string;
  multiplier: number;
  badCuts: number;
  missedNotes: number;
  maxCombo: number;
  fullCombo: boolean;
  hmd: number;
  hasReplay: boolean;
  timeSet: string;
  deviceHmd: string;
  deviceControllerLeft: string;
  deviceControllerRight: string;
  leaderboard: ScoreSaberLeaderboardToken;
}
