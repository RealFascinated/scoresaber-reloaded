import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { isProduction } from "@ssr/common/utils/utils";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PlayerService } from "../player/player.service";

export class MedalScoresService {
  private static IGNORE_SCORES = false;

  /**
   * Refreshes the medal scores for all ranked leaderboards.
   */
  public static async refreshMedalScores() {
    MedalScoresService.IGNORE_SCORES = true;
    // Delete all of the old scores
    await ScoreSaberMedalsScoreModel.deleteMany({});

    const rankedLeaderboards = await LeaderboardService.getRankedLeaderboards();
    for (const [index, leaderboard] of rankedLeaderboards.entries()) {
      const firstPage = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboard.id, 1, {
          priority: isProduction() ? CooldownPriority.BACKGROUND : CooldownPriority.NORMAL,
        });
      if (!firstPage) {
        continue;
      }

      const scores = firstPage.scores;
      for (const score of scores) {
        // Ignore scores that aren't top 10
        if (score.rank > 10) {
          continue;
        }

        // Create a new medal score
        new ScoreSaberMedalsScoreModel({
          ...getScoreSaberScoreFromToken(score, leaderboard, score.leaderboardPlayerInfo.id),
          medals: MEDAL_COUNTS[score.rank as keyof typeof MEDAL_COUNTS],
        }).save();
      }

      if (index % 100 === 0) {
        Logger.info(
          `[MEDAL SCORES] Refreshed ${index} of ${rankedLeaderboards.length} ranked leaderboards`
        );
      }
    }

    Logger.info(`[MEDAL SCORES] Refreshed all ranked leaderboards`);
    MedalScoresService.IGNORE_SCORES = false;
  }

  /**
   * Handles an incoming score to update the medals count for the player.
   *
   * @param incomingScore the incoming score.
   */
  public static async handleIncomingMedalsScoreUpdate(incomingScore: ScoreSaberScore) {
    if (MedalScoresService.IGNORE_SCORES || incomingScore.rank > 10 || incomingScore.pp <= 0) {
      Logger.debug(
        `[MEDAL SCORES] Ignoring score ${incomingScore.scoreId}. Ignore scores: ${MedalScoresService.IGNORE_SCORES}, rank: ${incomingScore.rank}, pp: ${incomingScore.pp}`
      );
      return;
    }
    const medalScore = new ScoreSaberMedalsScoreModel({
      ...incomingScore,
      medals: MEDAL_COUNTS[incomingScore.rank as keyof typeof MEDAL_COUNTS],
    });

    const leaderboardScores = await ScoreSaberMedalsScoreModel.find({
      leaderboardId: medalScore.leaderboardId,
    })
      .sort({ score: -1 }) // Sort by score descending (highest score first)
      .lean();

    // Track affected players and their medal changes
    const affectedPlayers = new Set<string>();
    const medalChanges = new Map<string, number>();

    // Calculate medals before changes
    for (const score of leaderboardScores) {
      affectedPlayers.add(score.playerId);
      medalChanges.set(score.playerId, (medalChanges.get(score.playerId) || 0) - score.medals);
    }

    // Add the new score and sort by from best to worst score
    const scores = [...leaderboardScores, medalScore].sort((a, b) => b.score - a.score); // Sort by score descending (highest score first)

    // Recalculate score ranks and medals
    for (const [index, score] of scores.entries()) {
      score.rank = index + 1;
      score.medals = MEDAL_COUNTS[score.rank as keyof typeof MEDAL_COUNTS];
    }

    // Calculate medals after changes (only top 10)
    for (const score of scores.slice(0, 10)) {
      affectedPlayers.add(score.playerId);
      medalChanges.set(score.playerId, (medalChanges.get(score.playerId) || 0) + score.medals);
    }

    // Delete the scores past the 10th place
    for (const score of scores.slice(10)) {
      await ScoreSaberMedalsScoreModel.deleteOne({ _id: score._id });
    }

    // Insert the new score
    await medalScore.save();

    // Update only affected players' medal counts
    if (affectedPlayers.size > 0) {
      await MedalScoresService.updateAffectedPlayerMedals(medalChanges);
    }

    // Recalculate the medal ranks
    PlayerService.updatePlayerMedalsRank();
  }

  /**
   * Updates medal counts for only the affected players.
   */
  public static async updateAffectedPlayerMedals(medalChanges: Map<string, number>): Promise<void> {
    // Use bulk operations for efficiency
    const bulkOps = [];
    for (const [playerId, change] of medalChanges) {
      if (change !== 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: playerId },
            update: { $inc: { medals: change } },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await PlayerModel.bulkWrite(bulkOps);
      Logger.debug(`[MEDAL SCORES] Updated ${bulkOps.length} players' medal counts`);
    }
  }
}
