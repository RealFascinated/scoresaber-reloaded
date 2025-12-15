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
import { PlayerModel } from "@ssr/common/model/player/player";
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
    // Invalid score, or we're ignoring scores
    if (MedalScoresService.IGNORE_SCORES || incomingScore.rank > 10 || incomingScore.pp <= 0) {
      Logger.debug(
        `[MEDAL SCORES] Ignoring score ${incomingScore.scoreId}. Ignore scores: ${MedalScoresService.IGNORE_SCORES}, rank: ${incomingScore.rank}, pp: ${incomingScore.pp}`
      );
      return;
    }
    
    /**
     * Updates the medal scores for the leaderboard.
     *
     * @returns the affected player ids
     */
    async function updateMedalScores(): Promise<string[]> {
      const existingScores = await ScoreSaberMedalsScoreModel.find({
        leaderboardId: incomingScore.leaderboardId,
      })
        .sort({ score: -1 })
        .lean();

      const oldScoreMedals = new Map<string, number>();
      for (const score of existingScores) {
        const current = oldScoreMedals.get(score.playerId) ?? 0;
        oldScoreMedals.set(score.playerId, current + score.medals);
      }

      const existingScoreIndex = existingScores.findIndex(
        s => s.playerId === incomingScore.playerId && s.leaderboardId === incomingScore.leaderboardId
      );

      const allScores = [...existingScores];
      if (existingScoreIndex >= 0) {
        const existingScore = existingScores[existingScoreIndex];
        allScores[existingScoreIndex] = { ...existingScore, ...incomingScore, medals: 0 };
      } else {
        allScores.push({ ...incomingScore, medals: 0 } as typeof existingScores[0]);
      }

      allScores.sort((a, b) => b.score - a.score);

      for (let i = 0; i < allScores.length; i++) {
        const rank = i + 1;
        allScores[i].rank = rank;
        allScores[i].medals = MEDAL_COUNTS[rank as keyof typeof MEDAL_COUNTS] ?? 0;
      }

      const top10Scores = allScores.slice(0, 10);
      const belowTop10 = allScores.slice(10);

      const newScoreMedals = new Map<string, number>();
      for (const score of top10Scores) {
        const current = newScoreMedals.get(score.playerId) ?? 0;
        newScoreMedals.set(score.playerId, current + score.medals);
      }

      if (top10Scores.length > 0) {
        await ScoreSaberMedalsScoreModel.bulkWrite(
          top10Scores.map(score => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _id, __v, ...data } = score;
            return {
              updateOne: {
                filter: { playerId: score.playerId, leaderboardId: score.leaderboardId },
                update: { $set: data },
                upsert: true,
              },
            };
          })
        );
      }

      if (belowTop10.length > 0) {
        await ScoreSaberMedalsScoreModel.deleteMany({
          $or: belowTop10.map(s => ({
            playerId: s.playerId,
            leaderboardId: s.leaderboardId,
          })),
        });
      }

      const allPlayerIds = new Set([...oldScoreMedals.keys(), ...newScoreMedals.keys()]);
      return Array.from(allPlayerIds).filter(playerId => {
        const oldCount = oldScoreMedals.get(playerId) ?? 0;
        const newCount = newScoreMedals.get(playerId) ?? 0;
        return oldCount !== newCount;
      });
    }

    /**
     * Gets the changes in medal counts for the players.
     */
    async function getChanges(affectedPlayerIds: string[]): Promise<Map<string, MedalChange>> {
      const playersBefore = await PlayerModel.find({
        _id: { $in: Array.from(affectedPlayerIds) },
      })
        .select("_id medals")
        .lean();

      const medalsBefore = Object.fromEntries(playersBefore.map(p => [p._id.toString(), p.medals ?? 0]));
      const medalsAfter = await PlayerMedalsService.updatePlayerMedalCounts(...affectedPlayerIds);

      const changes = new Map<string, MedalChange>();
      for (const playerId of affectedPlayerIds) {
        const before = medalsBefore[playerId] ?? 0;
        const after = medalsAfter[playerId] ?? 0;
        if (before !== after) {
          changes.set(playerId, { before, after });
        }
      }

      return changes;
    }

    const medalChanges = await updateMedalScores();
    const changes = await getChanges(medalChanges);

    Logger.info(
      `[MEDAL SCORES] Medal changes on leaderboard ${incomingScore.leaderboardId}: ${Array.from(changes.entries())
        .map(([playerId, change]) => `${playerId}: ${change.before} -> ${change.after}`)
        .join(", ")}`
    );

    const leaderboard = await LeaderboardCoreService.getLeaderboard(incomingScore.leaderboardId + "", {
      includeBeatSaver: false,
    });
    await sendMedalScoreNotification(incomingScore, leaderboard.leaderboard, beatLeaderScore, changes);
  }
}
