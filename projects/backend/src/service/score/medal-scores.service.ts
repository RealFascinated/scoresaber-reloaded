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

    // Get all existing scores for this leaderboard
    const leaderboardScores = await ScoreSaberMedalsScoreModel.find({
      leaderboardId: incomingScore.leaderboardId,
    })
      .sort({ score: -1 }) // Sort by score descending (highest score first)
      .lean();

    // Track affected players and their medal changes (before recalculation)
    const affectedPlayers = new Set<string>();
    const medalChanges = new Map<string, number>();

    // Calculate medals before changes (sum all medals per player)
    for (const score of leaderboardScores) {
      affectedPlayers.add(score.playerId);
      medalChanges.set(score.playerId, (medalChanges.get(score.playerId) || 0) + score.medals);
    }

    // Check if this score already exists (player improvement case)
    const existingScoreIndex = leaderboardScores.findIndex(
      s => s.playerId === incomingScore.playerId && s.leaderboardId === incomingScore.leaderboardId
    );

    // Create the incoming score as a plain object (matching .lean() format)
    const incomingScoreData = {
      ...incomingScore,
      medals: MEDAL_COUNTS[incomingScore.rank as keyof typeof MEDAL_COUNTS],
    };

    // Replace existing score or add new one
    let scores: Array<typeof incomingScoreData & { _id?: number }>;
    if (existingScoreIndex >= 0) {
      // Replace existing score with the new one
      scores = [...leaderboardScores];
      scores[existingScoreIndex] = {
        ...incomingScoreData,
        _id: leaderboardScores[existingScoreIndex]._id,
      };
    } else {
      // Add new score
      scores = [...leaderboardScores, incomingScoreData];
    }

    // Sort by score descending (highest score first)
    scores.sort((a, b) => b.score - a.score);

    // Track score changes for logging
    const scoreChanges: Array<{
      playerId: string;
      oldRank?: number;
      oldMedals?: number;
      newRank: number;
      newMedals: number;
    }> = [];

    // Create a map of old scores by playerId for comparison
    const oldScoresByPlayer = new Map<string, { rank: number; medals: number }>();
    for (const score of leaderboardScores) {
      oldScoresByPlayer.set(score.playerId, { rank: score.rank, medals: score.medals });
    }

    // Recalculate score ranks and medals for all scores
    for (const [index, score] of scores.entries()) {
      const oldScore = oldScoresByPlayer.get(score.playerId);
      const newRank = index + 1;
      const newMedals = MEDAL_COUNTS[newRank as keyof typeof MEDAL_COUNTS];

      score.rank = newRank;
      score.medals = newMedals;

      // Track changes for scores in top 10
      if (newRank <= 10) {
        if (!oldScore || oldScore.rank !== newRank || oldScore.medals !== newMedals) {
          scoreChanges.push({
            playerId: score.playerId,
            oldRank: oldScore?.rank,
            oldMedals: oldScore?.medals,
            newRank,
            newMedals,
          });
        }
      }
    }

    // Log score medal changes
    if (scoreChanges.length > 0) {
      Logger.info(
        `[MEDAL SCORES] Score changes for leaderboard ${incomingScore.leaderboardId}: ${scoreChanges
          .map(
            s =>
              `Player ${s.playerId}: ${s.oldRank ? `rank ${s.oldRank} (${s.oldMedals} medals)` : "new"} → rank ${s.newRank} (${s.newMedals} medals)`
          )
          .join(", ")}`
      );
    }

    // Save all top 10 scores using upsert (playerId + leaderboardId is unique per leaderboard)
    const top10Scores = scores.slice(0, 10);
    const bulkOps = [];
    for (const score of top10Scores) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...scoreData } = score;
      bulkOps.push({
        updateOne: {
          filter: {
            playerId: score.playerId,
            leaderboardId: score.leaderboardId,
          },
          update: {
            $set: scoreData,
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await ScoreSaberMedalsScoreModel.bulkWrite(bulkOps);
    }

    // Calculate medals after changes (sum all medals per player in top 10)
    const newMedalCounts = new Map<string, number>();
    for (const score of top10Scores) {
      affectedPlayers.add(score.playerId);
      newMedalCounts.set(score.playerId, (newMedalCounts.get(score.playerId) || 0) + score.medals);
    }

    // Delete scores past the 10th place (only those that were in the database)
    const scoresToDelete = scores.slice(10).filter(s => s._id !== undefined);
    if (scoresToDelete.length > 0) {
      await ScoreSaberMedalsScoreModel.deleteMany({
        _id: { $in: scoresToDelete.map(s => s._id) },
      });
    }

    // Calculate net change for each player
    const playerMedalChanges: Array<{
      playerId: string;
      oldMedals: number;
      newMedals: number;
      change: number;
    }> = [];
    for (const playerId of affectedPlayers) {
      const oldMedals = medalChanges.get(playerId) || 0;
      const newMedals = newMedalCounts.get(playerId) || 0;
      const change = newMedals - oldMedals;
      medalChanges.set(playerId, change);
      if (change !== 0) {
        playerMedalChanges.push({ playerId, oldMedals, newMedals, change });
      }
    }

    // Log player medal changes
    if (playerMedalChanges.length > 0) {
      Logger.info(
        `[MEDAL SCORES] Player medal changes: ${playerMedalChanges
          .map(
            p =>
              `Player ${p.playerId}: ${p.oldMedals} → ${p.newMedals} (${p.change > 0 ? "+" : ""}${p.change})`
          )
          .join(", ")}`
      );
    }

    // Update only affected players' medal counts
    if (affectedPlayers.size > 0) {
      await MedalScoresService.updateAffectedPlayerMedals(medalChanges);
    }
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
