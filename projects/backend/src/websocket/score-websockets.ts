import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerModel } from "@ssr/common/model/player/player";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { connectBeatLeaderWebsocket } from "@ssr/common/websocket/beatleader-websocket";
import { connectScoresaberWebsocket } from "@ssr/common/websocket/scoresaber-websocket";
import { EventListener } from "../event/event-listener";
import { EventsManager } from "../event/events-manager";
import { LeaderboardCoreService } from "../service/leaderboard/leaderboard-core.service";
import { PlayerCoreService } from "../service/player/player-core.service";
import { TopScoresService } from "../service/score/top-scores.service";
import ScoreSaberService from "../service/scoresaber.service";

interface PendingScore {
  scoreSaberToken?: ScoreSaberScoreToken;
  leaderboardToken?: ScoreSaberLeaderboardToken;
  player?: ScoreSaberLeaderboardPlayerInfoToken;
  beatLeaderScore?: BeatLeaderScoreToken;
  timestamp: number;
}

export class ScoreWebsockets implements EventListener {
  private static readonly SCORE_MATCH_TIMEOUT = TimeUnit.toMillis(TimeUnit.Minute, 5);
  private static readonly pendingScores = new Map<string, PendingScore>();

  constructor() {
    // Start the match timeout interval timer
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, pendingScore] of ScoreWebsockets.pendingScores.entries()) {
          if (now - pendingScore.timestamp >= ScoreWebsockets.SCORE_MATCH_TIMEOUT) {
            ScoreWebsockets.clearPendingScore(key);
            if (
              pendingScore.scoreSaberToken &&
              pendingScore.leaderboardToken &&
              pendingScore.player
            ) {
              this.processScore(
                pendingScore.scoreSaberToken,
                pendingScore.leaderboardToken,
                pendingScore.player
              );
            } else if (pendingScore.beatLeaderScore) {
              this.processScore(undefined, undefined, undefined, pendingScore.beatLeaderScore);
            }
          }
        }
      },
      TimeUnit.toMillis(TimeUnit.Minute, 1)
    );

    // Connect to websockets
    connectScoresaberWebsocket({
      onScore: async score => {
        try {
          const player = score.score.leaderboardPlayerInfo;
          const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);

          const key =
            `${player.id}-${leaderboard.songHash}-${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`.toUpperCase();
          const pendingScore = ScoreWebsockets.pendingScores.get(key);

          //Logger.info(`[SS-WS] Received score for player ${player.id} with key ${key}`);

          if (pendingScore?.beatLeaderScore) {
            // Found a matching BeatLeader score, process both
            ScoreWebsockets.clearPendingScore(key);
            await this.processScore(
              score.score,
              score.leaderboard,
              score.score.leaderboardPlayerInfo,
              pendingScore.beatLeaderScore
            );
          } else {
            // No matching BeatLeader score yet, store this one
            ScoreWebsockets.pendingScores.set(key, {
              scoreSaberToken: score.score,
              leaderboardToken: score.leaderboard,
              player: score.score.leaderboardPlayerInfo,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          Logger.error("[SS-WS] Error processing ScoreSaber score:", error);
        }
      },
      onDisconnect: event => {
        Logger.warn("[SS-WS] ScoreSaber websocket disconnected:", event);
      },
    });

    connectBeatLeaderWebsocket({
      onScore: async beatLeaderScore => {
        try {
          const player = beatLeaderScore.player;
          const leaderboard = beatLeaderScore.leaderboard;

          const key =
            `${player.id}-${leaderboard.song.hash}-${leaderboard.difficulty.difficultyName}-${leaderboard.difficulty.modeName}`.toUpperCase();
          const pendingScore = ScoreWebsockets.pendingScores.get(key);

          // Logger.info(
          //   `[BL-WS] Received score for player ${player.id}(${player.platform}) with key ${key}`
          // );

          if (
            pendingScore?.scoreSaberToken &&
            pendingScore.leaderboardToken &&
            pendingScore.player
          ) {
            // Found a matching ScoreSaber score, process both
            ScoreWebsockets.clearPendingScore(key);
            await this.processScore(
              pendingScore.scoreSaberToken,
              pendingScore.leaderboardToken,
              pendingScore.player,
              beatLeaderScore
            );
          } else {
            // No matching ScoreSaber score yet, store this one
            ScoreWebsockets.pendingScores.set(key, {
              beatLeaderScore,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          Logger.error("[BL-WS] Error processing BeatLeader score:", error);
        }
      },
    });
  }

  /**
   * Clear a pending score.
   *
   * @param key the key of the pending score to clear.
   */
  private static clearPendingScore(key: string) {
    this.pendingScores.delete(key);
  }

  /**
   * Process a score.
   *
   * @param scoreSaberToken the ScoreSaber score to process.
   * @param leaderboardToken the leaderboard for the score.
   * @param player the player for the score.
   * @param beatLeaderScore the BeatLeader score to process.
   */
  private async processScore(
    scoreSaberToken?: ScoreSaberScoreToken,
    leaderboardToken?: ScoreSaberLeaderboardToken,
    player?: ScoreSaberLeaderboardPlayerInfoToken,
    beatLeaderScore?: BeatLeaderScoreToken
  ) {
    if (scoreSaberToken && leaderboardToken && player) {
      const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
      const score = getScoreSaberScoreFromToken(scoreSaberToken, leaderboard, player.id);
      const isTop50GlobalScore = await TopScoresService.isTop50GlobalScore(score);

      // Create the player, update their name if they are already being tracked
      if (!(await PlayerCoreService.createPlayer(player.id))) {
        Promise.all([
          // Update the player's name last
          player.name ? PlayerCoreService.updatePlayerName(player.id, player.name) : undefined,

          // Update the player's last score date
          PlayerModel.updateOne({ _id: player.id }, { $set: { lastScore: new Date() } }),

          // Update cached player in Redis
          ScoreSaberService.updateCachedPlayer(player.id, player),
        ]);
      }

      // Fetch the leaderboard if it doesn't exist
      if (!(await LeaderboardCoreService.leaderboardExists(leaderboard.id))) {
        await LeaderboardCoreService.createLeaderboard(leaderboard.id, leaderboardToken);
      } else {
        await ScoreSaberLeaderboardModel.updateOne(
          { _id: leaderboard.id },
          { $set: { plays: leaderboard.plays, dailyPlays: leaderboard.dailyPlays } }
        );
      }

      EventsManager.getListeners().forEach(listener => {
        listener.onScoreReceived?.(score, leaderboard, player, beatLeaderScore, isTop50GlobalScore);
      });
    }
  }

  onStop: () => Promise<void> = async () => {
    // Process all pending scores
    for (const [key, pendingScore] of ScoreWebsockets.pendingScores.entries()) {
      // Process the score
      this.processScore(
        pendingScore.scoreSaberToken,
        pendingScore.leaderboardToken,
        pendingScore.player,
        pendingScore.beatLeaderScore
      );

      ScoreWebsockets.pendingScores.delete(key);
    }
  };
}
