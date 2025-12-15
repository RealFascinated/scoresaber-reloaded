import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { MedalChange } from "@ssr/common/schemas/medals/medal-changes";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { isProduction } from "@ssr/common/utils/utils";
import { sendMedalScoreNotification } from "../../common/score/score.util";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { LeaderboardLeaderboardsService } from "../leaderboard/leaderboard-leaderboards.service";
import { PlayerMedalsService } from "../player/player-medals.service";

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
      const page = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboard.id, 1, {
          priority: isProduction() ? CooldownPriority.BACKGROUND : CooldownPriority.NORMAL,
        });
      if (!page) {
        continue;
      }

      for (const score of page.scores) {
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
        Logger.info(`[MEDAL SCORES] Refreshed ${index} of ${rankedLeaderboards.length} ranked leaderboards`);
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
  public static async handleIncomingMedalsScoreUpdate(
    incomingScore: ScoreSaberScore,
    beatLeaderScore: AdditionalScoreData | undefined
  ) {
    if (MedalScoresService.IGNORE_SCORES || incomingScore.rank > 10 || incomingScore.pp <= 0) {
      Logger.debug(
        `[MEDAL SCORES] Ignoring score ${incomingScore.scoreId}. Ignore scores: ${MedalScoresService.IGNORE_SCORES}, rank: ${incomingScore.rank}, pp: ${incomingScore.pp}`
      );
      return;
    }
    const leaderboard = await LeaderboardCoreService.getLeaderboard(incomingScore.leaderboardId + "", {
      includeBeatSaver: false,
    });

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
      medals: 0, // Will be recalculated after sorting
      _id: existingScore?._id,
    };
    const updatedScores = [...scoresWithoutPlayer, incomingScoreData].sort((a, b) => b.score - a.score);

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
    const scoreUpdates = top10Scores.map(score => {
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
    if (scoreUpdates.length > 0) {
      await ScoreSaberMedalsScoreModel.bulkWrite(scoreUpdates);
    }

    // Delete scores below top 10
    const scoresToDelete = updatedScores.slice(10);
    if (scoresToDelete.length > 0) {
      const deleteConditions = scoresToDelete.map(s => ({
        playerId: s.playerId,
        leaderboardId: s.leaderboardId,
      }));
      await ScoreSaberMedalsScoreModel.deleteMany({
        $or: deleteConditions,
      });
    }

    const changes = new Map<string, MedalChange>();
    for (const [playerId, newMedalCount] of newMedalCounts.entries()) {
      const oldMedalCount = oldMedalCounts.get(playerId) || 0;
      changes.set(playerId, { before: oldMedalCount, after: newMedalCount });
    }

    await PlayerMedalsService.updatePlayerMedalCounts(...changes.keys());

    //  Log medal changes
    Logger.info(
      `[MEDAL SCORES] Medal changes on leaderboard ${incomingScore.leaderboardId}: ${Array.from(changes.entries())
        .map(([playerId, change]) => `${playerId}: ${change.before} -> ${change.after}`)
        .join(", ")}`
    );

    // Send notifications for medal changes
    await sendMedalScoreNotification(incomingScore, leaderboard.leaderboard, beatLeaderScore, changes);
  }
}
