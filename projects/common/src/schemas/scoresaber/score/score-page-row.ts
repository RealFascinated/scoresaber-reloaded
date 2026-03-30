import type { ScoreSaberLeaderboard } from "../leaderboard/leaderboard";
import type { ScoreSaberScore } from "./score";

/**
 * One ScoreSaber score row after joining leaderboard data (domain types, before optional BeatSaver etc.).
 * Extend with optional `previousScore` / `beatLeaderScore` when list queries join history / BeatLeader.
 */
export type ScoreSaberScorePageRow = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};
