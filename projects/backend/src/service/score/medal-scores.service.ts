import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberMedalsScoreModel } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { MedalChange } from "@ssr/common/schemas/medals/medal-changes";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { isProduction } from "@ssr/common/utils/utils";
import { sendMedalScoreNotification } from "../../common/score/score.util";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { PlayerMedalsService } from "../player/player-medals.service";

type MedalScoresQueueItem = {
  score: ScoreSaberScore;
  beatLeaderScore: AdditionalScoreData | undefined;
};

export class MedalScoresService {
  private static IGNORE_SCORES = false;
  private static SCORES_INGEST_QUEUE = new Set<MedalScoresQueueItem>();

  /**
   * Refreshes the medal scores for all ranked leaderboards.
   */
  public static async rescanMedalScores() {
    MedalScoresService.IGNORE_SCORES = true;

    // Delete all of the old scores
    await ScoreSaberMedalsScoreModel.deleteMany({});

    const rankedLeaderboards = await LeaderboardCoreService.getRankedLeaderboards();
    for (const [index, leaderboard] of rankedLeaderboards.entries()) {
      await this.rescanLeaderboard(leaderboard.id + "");

      if (index % 100 === 0) {
        Logger.info(
          `[MEDAL SCORES] Refreshed ${index} of ${rankedLeaderboards.length} ranked leaderboards`
        );
      }
    }

    Logger.info(`[MEDAL SCORES] Refreshed all ranked leaderboards`);
    MedalScoresService.IGNORE_SCORES = false;

    // Process the scores queue
    for (const item of MedalScoresService.SCORES_INGEST_QUEUE) {
      await MedalScoresService.handleIncomingMedalsScoreUpdate(item.score, item.beatLeaderScore);
    }
    MedalScoresService.SCORES_INGEST_QUEUE.clear();
  }

  /**
   * Rescans the medal scores for a leaderboard.
   *
   * @param leaderboardId the leaderboard id to rescan.
   */
  public static async rescanLeaderboard(leaderboardId: string, deleteScores: boolean = false) {
    if (deleteScores) {
      await ScoreSaberMedalsScoreModel.deleteMany({ leaderboardId });
    }

    const page = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboardScores(leaderboardId, 1, {
        priority: isProduction() ? CooldownPriority.BACKGROUND : CooldownPriority.NORMAL,
      });
    if (!page) {
      return;
    }

    for (const score of page.scores) {
      // Ignore scores that aren't top 10
      if (score.rank > 10) {
        continue;
      }

      // Create a new medal score
      new ScoreSaberMedalsScoreModel({
        ...getScoreSaberScoreFromToken(
          score,
          getScoreSaberLeaderboardFromToken(score.leaderboard),
          score.leaderboardPlayerInfo.id
        ),
        medals: MEDAL_COUNTS[score.rank as keyof typeof MEDAL_COUNTS],
      }).save();
    }
  }

  /**
   * Handles an incoming score to update the medals count for the player.
   *
   * @param score the incoming score.
   */
  public static async handleIncomingMedalsScoreUpdate(
    score: ScoreSaberScore,
    beatLeaderScore: AdditionalScoreData | undefined
  ) {
    // Invalid score
    if (score.rank > 10 || score.pp <= 0) {
      return;
    }

    // Add to update queue
    if (MedalScoresService.IGNORE_SCORES) {
      MedalScoresService.SCORES_INGEST_QUEUE.add({ score, beatLeaderScore });
      return;
    }

    /**
     * Updates the medal scores for the leaderboard.
     *
     * @returns the affected player ids
     */
    async function updateMedalScores(): Promise<string[]> {
      const existingScores = await ScoreSaberMedalsScoreModel.find({
        leaderboardId: score.leaderboardId,
      })
        .sort({ score: -1 })
        .lean();

      const oldScoreMedals = new Map<string, number>();
      for (const score of existingScores) {
        const current = oldScoreMedals.get(score.playerId) ?? 0;
        oldScoreMedals.set(score.playerId, current + score.medals);
      }

      const existingScoreIndex = existingScores.findIndex(
        s => s.playerId === score.playerId && s.leaderboardId === score.leaderboardId
      );

      const allScores = [...existingScores];
      if (existingScoreIndex >= 0) {
        const existingScore = existingScores[existingScoreIndex];
        allScores[existingScoreIndex] = { ...existingScore, ...score, medals: 0 };
      } else {
        allScores.push({ ...score, medals: 0 } as (typeof existingScores)[0]);
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

      const medalsBefore = Object.fromEntries(
        playersBefore.map(p => [p._id.toString(), p.medals ?? 0])
      );
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

    // No medal changes
    if (medalChanges.length === 0) {
      return;
    }
    const changes = await getChanges(medalChanges);

    Logger.info(
      `[MEDAL SCORES] Medal changes on leaderboard ${score.leaderboardId}: ${Array.from(
        changes.entries()
      )
        .map(([playerId, change]) => `${playerId}: ${change.before} -> ${change.after}`)
        .join(", ")}`
    );

    const leaderboard = await LeaderboardCoreService.getLeaderboard(score.leaderboardId + "", {
      includeBeatSaver: false,
    });
    await sendMedalScoreNotification(score, leaderboard.leaderboard, beatLeaderScore, changes);
  }
}
