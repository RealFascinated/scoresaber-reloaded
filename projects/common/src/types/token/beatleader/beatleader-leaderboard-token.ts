import { BeatLeaderSongToken } from "./beatleader-song-token";
import { BeatLeaderDifficultyToken } from "./beatleader-difficulty-token";

export type BeatLeaderLeaderboardToken = {
  id: string;
  song: BeatLeaderSongToken;
  difficulty: BeatLeaderDifficultyToken;
  scores: null; // ??
  changes: null; // ??
  qualification: null; // ??
  reweight: null; // ??
  leaderboardGroup: null; // ??
  plays: number;
  clan: null; // ??
  clanRankingContested: boolean;
};
