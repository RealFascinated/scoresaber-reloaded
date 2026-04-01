import Logger from "@ssr/common/logger";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ScoreSaberAccountRow } from "../../db/schema";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import {
  type ScoreSaberScoreUpsertRow,
  ScoreSaberScoresRepository,
} from "../../repositories/scoresaber-scores.repository";
import BeatLeaderService from "../beatleader/beatleader.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import { ScoreSaberMedalScoresService } from "./scoresaber-medal-scores.service";

type InsertScoreDataOptions = {
  insertBeatLeaderScore?: boolean;
  insertPreviousScore?: boolean;
  insertPlayerInfo?: boolean;
};

export class ScoreCoreService {
  /**
   * Tracks ScoreSaber score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard for the score
   * @param player the player for the score
   * @param newScore whether the score was just set
   * @param log whether to log the score
   * @returns whether the score was tracked
   */
  public static async trackScoreSaberScore(
    score: ScoreSaberScore,
    beatLeaderScore: BeatLeaderScore | undefined,
    leaderboard: ScoreSaberLeaderboard,
    newScore: boolean = false
  ): Promise<{
    score: ScoreSaberScore | undefined;
    hasPreviousScore: boolean;
    tracked: boolean;
  }> {
    const before = performance.now();

    if (await ScoreSaberScoresRepository.existsByScoreIdAndScore(score.scoreId, score.score)) {
      return { score: undefined, hasPreviousScore: false, tracked: false };
    }

    const playerId = score.playerId;
    let isImprovement = false;
    if (newScore) {
      const previousRow = await ScoreSaberScoresRepository.findByPlayerAndLeaderboard(
        playerId,
        leaderboard.id
      );

      isImprovement = previousRow !== undefined;
      if (isImprovement && previousRow) {
        const previous = previousRow;

        // Move old score to history (snapshot the row being replaced, not the incoming score)
        await ScoreSaberScoreHistoryRepository.insertSnapshot(previous, playerId, leaderboard.id);

        await ScoreSaberScoresRepository.deleteByScoreId(previous.scoreId);
      }
    }

    const playerUpdates: Partial<ScoreSaberAccountRow> = {
      scoreStats: await PlayerCoreService.getPlayerScoreStats(playerId),
    };
    // We only want to update the player's HMD if the score is new
    if (newScore) {
      playerUpdates.hmd = score.hmd;
    }
    await PlayerCoreService.updatePlayer(playerId, playerUpdates);

    // Handle score for medal updates
    if (newScore && leaderboard.ranked && score.rank <= 10) {
      await ScoreSaberMedalScoresService.handleIncomingMedalsScoreUpdate(score, beatLeaderScore);
    }

    const modifiers = score.modifiers.map(modifier => modifier.toString());
    const scoreUpsertSet: ScoreSaberScoreUpsertRow = {
      scoreId: score.scoreId,
      playerId: playerId,
      leaderboardId: leaderboard.id,
      difficulty: score.difficulty,
      characteristic: score.characteristic,
      score: score.score,
      accuracy: score.accuracy,
      pp: score.pp,
      missedNotes: score.missedNotes,
      badCuts: score.badCuts,
      maxCombo: score.maxCombo,
      fullCombo: score.fullCombo,
      modifiers: modifiers.length > 0 ? modifiers : null,
      hmd: score.hmd,
      rightController: score.rightController,
      leftController: score.leftController,
      timestamp: score.timestamp,
    };

    await ScoreSaberScoresRepository.upsertScore(scoreUpsertSet);

    if (newScore) {
      Logger.info(
        `Tracked ScoreSaber score "%s" for "%s" on "%s" [%s / %s]%s in %s`,
        score.scoreId,
        score.playerInfo?.name ?? playerId,
        leaderboard.songName,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        isImprovement ? ` (improvement)` : "",
        formatDuration(performance.now() - before)
      );
    }
    return { score: score, hasPreviousScore: isImprovement, tracked: true };
  }

  /**
   * Inserts the score data into the score.
   *
   * @param score the score to insert data into
   * @param leaderboard the leaderboard to get the data from
   * @returns the score with the data inserted
   */
  public static async insertScoreData(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberScore>;
  public static async insertScoreData(
    score: ScoreSaberMedalScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberMedalScore>;
  public static async insertScoreData(
    score: ScoreSaberScore | ScoreSaberMedalScore,
    leaderboard: ScoreSaberLeaderboard,
    options?: InsertScoreDataOptions
  ): Promise<ScoreSaberScore | ScoreSaberMedalScore> {
    options = {
      insertBeatLeaderScore: true,
      insertPreviousScore: true,
      insertPlayerInfo: true,
      ...options,
    };

    leaderboard = !leaderboard
      ? await ScoreSaberLeaderboardsService.getLeaderboard(score.leaderboardId)
      : leaderboard;

    // If the leaderboard is not found, return the plain score
    if (!leaderboard) {
      return score;
    }

    async function getBeatLeaderScore() {
      if (options?.insertBeatLeaderScore === false) {
        return undefined;
      }
      return BeatLeaderService.getBeatLeaderScoreFromSong(
        score.playerId,
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        score.score
      );
    }

    async function getPreviousScore() {
      if (options?.insertPreviousScore && leaderboard) {
        return PlayerScoreHistoryService.getPlayerPreviousScore(score, leaderboard);
      }
      return undefined;
    }

    async function getPlayerInfo() {
      if (options?.insertPlayerInfo) {
        return PlayerCoreService.getAccount(score.playerId);
      }
      return undefined;
    }

    const [beatLeaderScore, previousScore, playerInfo] = await Promise.all([
      getBeatLeaderScore(),
      getPreviousScore(),
      getPlayerInfo(),
    ]);

    if (beatLeaderScore !== undefined) {
      score.beatLeaderScore = beatLeaderScore;
    }

    if (previousScore !== undefined) {
      score.previousScore = previousScore;
    }

    if (playerInfo !== undefined) {
      score.playerInfo = {
        id: playerInfo.id,
        name: playerInfo.name,
        profilePicture: playerInfo.avatar,
        country: playerInfo.country,
      };
    }

    return score;
  }
}
