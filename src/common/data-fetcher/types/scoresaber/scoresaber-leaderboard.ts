import ScoreSaberDifficulty from "./scoresaber-difficulty";

export default interface ScoreSaberLeaderboard {
  id: number;
  songHash: string;
  songName: string;
  songSubName: string;
  songAuthorName: string;
  levelAuthorName: string;
  difficulty: ScoreSaberDifficulty;
  maxScore: number;
  createdDate: string;
  rankedDate: string;
  qualifiedDate: string;
  lovedDate: string;
  ranked: boolean;
  qualified: boolean;
  loved: boolean;
  maxPP: number;
  stars: number;
  positiveModifiers: boolean;
  plays: boolean;
  dailyPlays: boolean;
  coverImage: string;
  difficulties: ScoreSaberDifficulty[];
}
