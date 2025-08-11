import { LeaderboardCoreService } from "./leaderboard-core.service";
import { LeaderboardHmdService } from "./leaderboard-hmd.service";
import { LeaderboardLeaderboardsService } from "./leaderboard-leaderboards.service";
import { LeaderboardNotificationsService } from "./leaderboard-notifications.service";
import { LeaderboardRankingService } from "./leaderboard-ranking.service";
import { LeaderboardScoresService } from "./leaderboard-scores.service";

export class LeaderboardService {
  // LeaderboardCoreService methods
  public static validateCachedLeaderboard = LeaderboardCoreService.validateCachedLeaderboard;
  public static processLeaderboard = LeaderboardCoreService.processLeaderboard;
  public static updateLeaderboardDifficulties =
    LeaderboardCoreService.updateLeaderboardDifficulties;
  public static getLeaderboard = LeaderboardCoreService.getLeaderboard;
  public static getLeaderboardByHash = LeaderboardCoreService.getLeaderboardByHash;
  public static getLeaderboards = LeaderboardCoreService.getLeaderboards;
  public static fetchAllLeaderboards = LeaderboardCoreService.fetchAllLeaderboards;
  public static saveLeaderboard = LeaderboardCoreService.saveLeaderboard;
  public static leaderboardToObject = LeaderboardCoreService.leaderboardToObject;
  public static fetchAndSaveLeaderboard = LeaderboardCoreService.fetchAndSaveLeaderboard;
  public static fetchBeatSaverData = LeaderboardCoreService.fetchBeatSaverData;
  public static fetchAndSaveLeaderboardByHash =
    LeaderboardCoreService.fetchAndSaveLeaderboardByHash;
  public static createLeaderboardData = LeaderboardCoreService.createLeaderboardData;
  public static updateLeaderboardPlayCounts = LeaderboardCoreService.updateLeaderboardPlayCounts;

  // LeaderboardLeaderboardsService methods
  public static getRankedLeaderboards = LeaderboardLeaderboardsService.getRankedLeaderboards;
  public static getQualifiedLeaderboards = LeaderboardLeaderboardsService.getQualifiedLeaderboards;
  public static getRankingQueueLeaderboards =
    LeaderboardLeaderboardsService.getRankingQueueLeaderboards;
  public static refreshQualifiedLeaderboards =
    LeaderboardLeaderboardsService.refreshQualifiedLeaderboards;
  public static refreshRankedLeaderboards =
    LeaderboardLeaderboardsService.refreshRankedLeaderboards;
  public static refreshLeaderboards = LeaderboardLeaderboardsService.refreshLeaderboards;
  public static fetchAllRankedLeaderboards =
    LeaderboardLeaderboardsService.fetchAllRankedLeaderboards;
  public static fetchAllQualifiedLeaderboards =
    LeaderboardLeaderboardsService.fetchAllQualifiedLeaderboards;

  // LeaderboardRankingService methods
  public static unrankOldLeaderboards = LeaderboardRankingService.unrankOldLeaderboards;
  public static processLeaderboardUpdates = LeaderboardRankingService.processLeaderboardUpdates;
  public static checkLeaderboardChanges = LeaderboardRankingService.checkLeaderboardChanges;
  public static updateRankedMapDifficulties = LeaderboardRankingService.updateRankedMapDifficulties;
  public static handleLeaderboardUpdate = LeaderboardRankingService.handleLeaderboardUpdate;
  public static unrankLeaderboard = LeaderboardRankingService.unrankLeaderboard;
  public static fetchStarChangeHistory = LeaderboardRankingService.fetchStarChangeHistory;

  // LeaderboardScoresService methods
  public static getTrackedScoresCount = LeaderboardScoresService.getTrackedScoresCount;
  public static fetchAllLeaderboardScores = LeaderboardScoresService.fetchAllLeaderboardScores;

  // LeaderboardNotificationsService methods
  public static logLeaderboardUpdates = LeaderboardNotificationsService.logLeaderboardUpdates;

  // LeaderboardHmdService methods
  public static getPlaysByHmd = LeaderboardHmdService.getPlaysByHmd;
}
