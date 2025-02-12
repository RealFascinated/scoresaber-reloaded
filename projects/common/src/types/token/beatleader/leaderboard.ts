import { BeatLeaderDifficultyToken } from "./difficulty";
import { BeatLeaderSongToken } from "./score/song";

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
