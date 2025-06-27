import { PlayerAccuraciesService } from "./player-accuracies.service";
import { PlayerCalendarService } from "./player-calendar.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerFriendScoresService } from "./player-friend-scores.service";
import { PlayerHistoryService } from "./player-history.service";
import { PlayerHmdService } from "./player-hmd.service";
import { PlayerMedalsService } from "./player-medals.service";
import { PlayerRankedService } from "./player-ranked.service";
import { PlayerScoreHistoryService } from "./player-score-history.service";
import { PlayerScoresService } from "./player-scores.service";
import { PlayerSearchService } from "./player-search.service";

export class PlayerService {
  // PlayerCoreService methods
  public static getPlayer = PlayerCoreService.getPlayer;
  public static playerExists = PlayerCoreService.playerExists;
  public static updatePlayerName = PlayerCoreService.updatePlayerName;
  public static refreshPlayer = PlayerCoreService.refreshPlayer;

  // PlayerSearchService methods
  public static searchPlayers = PlayerSearchService.searchPlayers;
  public static getPlayerRanking = PlayerSearchService.getPlayerRanking;

  // PlayerRankedService methods
  public static getPlayerRankedPps = PlayerRankedService.getPlayerRankedPps;
  public static getPlayerPpBoundary = PlayerRankedService.getPlayerPpBoundary;
  public static getPlayerPpBoundaryFromScorePp = PlayerRankedService.getPlayerPpBoundaryFromScorePp;
  public static updatePeakRank = PlayerRankedService.updatePeakRank;

  // PlayerHistoryService methods
  public static trackPlayer = PlayerHistoryService.trackPlayer;
  public static updatePlayerStatistics = PlayerHistoryService.updatePlayerStatistics;
  public static trackPlayerHistory = PlayerHistoryService.trackPlayerHistory;
  public static getPlayerStatisticHistory = PlayerHistoryService.getPlayerStatisticHistory;
  public static seedPlayerHistory = PlayerHistoryService.seedPlayerHistory;
  public static updatePlayerDailyScoreStats = PlayerHistoryService.updatePlayerDailyScoreStats;
  public static getTodayPlayerStatistic = PlayerHistoryService.getTodayPlayerStatistic;
  public static createPlayerStatistic = PlayerHistoryService.createPlayerStatistic;
  public static playerHistoryToObject = PlayerHistoryService.playerHistoryToObject;
  public static getDaysTracked = PlayerHistoryService.getDaysTracked;

  // PlayerCalendarService methods
  public static generateScoreCalendar = PlayerCalendarService.generateScoreCalendar;

  // PlayerScoresService methods
  public static refreshAllPlayerScores = PlayerScoresService.refreshAllPlayerScores;
  public static getPlayerScoreChart = PlayerScoresService.getPlayerScoreChart;
  public static getPlayerScores = PlayerScoresService.getPlayerScores;
  public static getScoreSaberCachedPlayerScores =
    PlayerScoresService.getScoreSaberCachedPlayerScores;
  public static getScoreSaberLivePlayerScores = PlayerScoresService.getScoreSaberLivePlayerScores;

  // PlayerAccuraciesService methods
  public static getPlayerAverageAccuracies = PlayerAccuraciesService.getPlayerAverageAccuracies;
  public static getAccBadges = PlayerAccuraciesService.getAccBadges;

  // PlayerHmdService methods
  public static getPlayerHMD = PlayerHmdService.getPlayerHMD;
  public static updatePlayerHmd = PlayerHmdService.updatePlayerHmd;
  public static getActiveHmdUsage = PlayerHmdService.getActiveHmdUsage;
  public static getPlayerMostCommonRecentHmd = PlayerHmdService.getPlayerMostCommonRecentHmd;

  // PlayerScoreHistoryService methods
  public static getPlayerScoreHistory = PlayerScoreHistoryService.getPlayerScoreHistory;
  public static getPlayerScoreHistoryGraph = PlayerScoreHistoryService.getPlayerScoreHistoryGraph;
  public static getPlayerPreviousScore = PlayerScoreHistoryService.getPlayerPreviousScore;

  // PlayerFriendScoresService methods
  public static getPlayerFriendLeaderboardScores =
    PlayerFriendScoresService.getPlayerFriendLeaderboardScores;
  public static getPlayerFriendScores = PlayerFriendScoresService.getPlayerFriendScores;

  // PlayerMedalsService methods
  public static updatePlayerMedalCounts = PlayerMedalsService.updatePlayerMedalCounts;
  public static updatePlayerGlobalMedalCounts = PlayerMedalsService.updatePlayerGlobalMedalCounts;
  public static updatePlayerMedalsRank = PlayerMedalsService.updatePlayerMedalsRank;
  public static getPlayerMedalRanking = PlayerMedalsService.getPlayerMedalRanking;
}
