import { BeatLeaderLeaderboardToken } from "./beatleader-leaderboard-token";
import { BeatLeaderScoreImprovementToken } from "./beatleader-score-improvement-token";
import { BeatLeaderScoreOffsetsToken } from "./beatleader-score-offsets-token";
import { BeatLeaderPlayerToken } from "./beatleader-player-token";

export type BeatLeaderScoreToken = {
  myScore: null; // ??
  validContexts: number;
  leaderboard: BeatLeaderLeaderboardToken;
  contextExtensions: null; // ??
  accLeft: number;
  accRight: number;
  id: number;
  baseScore: number;
  modifiedScore: number;
  accuracy: number;
  playerId: string;
  pp: number;
  bonusPp: number;
  passPP: number;
  accPP: number;
  techPP: number;
  rank: number;
  country: string;
  fcAccuracy: number;
  fcPp: number;
  weight: number;
  replay: string;
  modifiers: string;
  badCuts: number;
  missedNotes: number;
  bombCuts: number;
  wallsHit: number;
  pauses: number;
  fullCombo: boolean;
  platform: string;
  maxCombo: number;
  maxStreak: number;
  hmd: number;
  controller: number;
  leaderboardId: string;
  timeset: string;
  timepost: number;
  replaysWatched: number;
  playCount: number;
  priority: number;
  player: BeatLeaderPlayerToken; // ??
  scoreImprovement: BeatLeaderScoreImprovementToken;
  rankVoting: null; // ??
  metadata: null; // ??
  offsets: BeatLeaderScoreOffsetsToken;
};
