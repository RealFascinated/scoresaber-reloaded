import { LeaderboardScoresService } from "./leaderboard-scores.service";
import { ScoreCoreService } from "./score-core.service";
import { TopScoresService } from "./top-scores.service";

export class ScoreService {
  // ScoreCoreService methods
  public static trackScoreSaberScore = ScoreCoreService.trackScoreSaberScore;
  public static scoreExists = ScoreCoreService.scoreExists;
  public static insertScoreData = ScoreCoreService.insertScoreData;

  // TopScoresService methods
  public static getTopScores = TopScoresService.getTopScores;
  public static isTop50GlobalScore = TopScoresService.isTop50GlobalScore;

  // LeaderboardScoresService methods
  public static getLeaderboardScores = LeaderboardScoresService.getLeaderboardScores;
}
