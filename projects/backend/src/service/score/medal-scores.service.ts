import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { isProduction } from "@ssr/common/utils/utils";
import { LeaderboardLeaderboardsService } from "../leaderboard/leaderboard-leaderboards.service";

export class MedalScoresService {
  private static IGNORE_SCORES = false;

  /**
   * Refreshes the medal scores for all ranked leaderboards.
   */
  public static async rescanMedalScores() {
    MedalScoresService.IGNORE_SCORES = true;
    // Delete all of the old scores
    await ScoreSaberMedalsScoreModel.deleteMany({});

    const rankedLeaderboards = await LeaderboardLeaderboardsService.getRankedLeaderboards();
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

    const existingScores = await ScoreSaberMedalsScoreModel.find({
      leaderboardId: incomingScore.leaderboardId,
    })
      .sort({ score: -1 })
      .lean();

    // Calculate old medal counts
    const oldMedalCounts = new Map<string, number>();
    for (const score of existingScores) {
      oldMedalCounts.set(score.playerId, (oldMedalCounts.get(score.playerId) || 0) + score.medals);
    }

    // Replace or add incoming score
    const existingScore = existingScores.find(
      s => s.playerId === incomingScore.playerId && s.leaderboardId === incomingScore.leaderboardId
    );
    const scoresWithoutPlayer = existingScores.filter(
      s => s.playerId !== incomingScore.playerId || s.leaderboardId !== incomingScore.leaderboardId
    );
    const incomingScoreData = {
      ...incomingScore,
      medals: MEDAL_COUNTS[incomingScore.rank as keyof typeof MEDAL_COUNTS] || 0,
      _id: existingScore?._id,
    };
    const updatedScores = [...scoresWithoutPlayer, incomingScoreData].sort(
      (a, b) => b.score - a.score
    );

    // Recalculate ranks and medals
    for (const [index, score] of updatedScores.entries()) {
      const newRank = index + 1;
      score.rank = newRank;
      score.medals = MEDAL_COUNTS[newRank as keyof typeof MEDAL_COUNTS] || 0;
    }

    const top10Scores = updatedScores.slice(0, 10);

    // Calculate new medal counts
    const newMedalCounts = new Map<string, number>();
    for (const score of top10Scores) {
      newMedalCounts.set(score.playerId, (newMedalCounts.get(score.playerId) || 0) + score.medals);
    }

    // Save top 10 scores
    const bulkOps = top10Scores.map(score => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...scoreData } = score;
      return {
        updateOne: {
          filter: { playerId: score.playerId, leaderboardId: score.leaderboardId },
          update: { $set: scoreData },
          upsert: true,
        },
      };
    });
    if (bulkOps.length > 0) {
      await ScoreSaberMedalsScoreModel.bulkWrite(bulkOps);
    }

    // Delete scores below top 10
    const scoresToDelete = updatedScores.slice(10).filter(s => s._id !== undefined);
    if (scoresToDelete.length > 0) {
      await ScoreSaberMedalsScoreModel.deleteMany({
        _id: { $in: scoresToDelete.map(s => s._id) },
      });
    }

    // Calculate medal changes
    const medalChanges = new Map<string, number>();
    const allPlayers = new Set([...oldMedalCounts.keys(), ...newMedalCounts.keys()]);
    for (const playerId of allPlayers) {
      const oldMedals = oldMedalCounts.get(playerId) || 0;
      const newMedals = newMedalCounts.get(playerId) || 0;
      const change = newMedals - oldMedals;
      if (change !== 0) {
        medalChanges.set(playerId, change);
      }
    }

    // Log medal changes
    Logger.info(
      `[MEDAL SCORES] Medal changes on leaderboard ${incomingScore.leaderboardId}: ${Array.from(
        medalChanges.entries()
      )
        .map(([playerId, change]) => `${playerId}: ${change > 0 ? "+" : ""}${change}`)
        .join(", ")}`
    );

    if (medalChanges.size > 0) {
      await MedalScoresService.updatePlayerMedalCounts(medalChanges);
    }
  }

  /**
   * Updates medal counts for players.
   *
   * @param medalChanges the medal changes by player id.
   */
  public static async updatePlayerMedalCounts(medalChanges: Map<string, number>): Promise<void> {
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
      const changesSummary = Array.from(medalChanges.entries())
        .filter(([, change]) => change !== 0)
        .map(([playerId, change]) => `${playerId}: ${change > 0 ? "+" : ""}${change}`)
        .join(", ");
      Logger.info(
        `[MEDAL SCORES] Updated ${bulkOps.length} players' medal counts${changesSummary ? ` (${changesSummary})` : ""}`
      );
    }
  }
}
