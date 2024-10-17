import ScoreSaberDifficultyToken from "./score-saber-difficulty-token";

export default interface ScoreSaberLeaderboardToken {
  id: number;
  songHash: string;
  songName: string;
  songSubName: string;
  songAuthorName: string;
  levelAuthorName: string;
  difficulty: ScoreSaberDifficultyToken;
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
  plays: number;
  dailyPlays: number;
  coverImage: string;
  difficulties: ScoreSaberDifficultyToken[];
}
