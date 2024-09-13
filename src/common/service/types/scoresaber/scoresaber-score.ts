import ScoreSaberLeaderboard from "./scoresaber-leaderboard";
import ScoreSaberLeaderboardPlayerInfo from "./scoresaber-leaderboard-player-info";

export default interface ScoreSaberScore {
  id: string;
  leaderboardPlayerInfo: ScoreSaberLeaderboardPlayerInfo;
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
  leaderboard: ScoreSaberLeaderboard;
}
