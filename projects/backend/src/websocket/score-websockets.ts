import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { connectBeatLeaderWebsocket } from "@ssr/common/websocket/beatleader-websocket";
import { connectScoresaberWebsocket } from "@ssr/common/websocket/scoresaber-websocket";
import { EventListener } from "../event/event-listener";
import { EventsManager } from "../event/events-manager";
import { PlayerService } from "../service/player/player.service";
import { ScoreService } from "../service/score/score.service";
import Logger from "@ssr/common/logger";

interface PendingScore {
  scoreSaberToken?: ScoreSaberScoreToken;
  leaderboardToken?: ScoreSaberLeaderboardToken;
  player?: ScoreSaberPlayerToken;
  beatLeaderScore?: BeatLeaderScoreToken;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

export class ScoreWebsockets implements EventListener {
  private static readonly SCORE_MATCH_TIMEOUT = TimeUnit.toMillis(TimeUnit.Minute, 1);
  private static readonly pendingScores = new Map<string, PendingScore>();

  onStop?: () => Promise<void> = async () => {
    // Process all pending scores and clear their timeouts
    for (const [key, pendingScore] of ScoreWebsockets.pendingScores.entries()) {
      if (pendingScore.timeoutId) {
        clearTimeout(pendingScore.timeoutId);
        pendingScore.timeoutId = undefined;
      }

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

  constructor() {
    // Connect to websockets
    connectScoresaberWebsocket({
      onScore: async score => {
        const player = score.score.leaderboardPlayerInfo as unknown as ScoreSaberPlayerToken;
        const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);

        const key =
          `${player.id}-${leaderboard.songHash}-${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`.toUpperCase();
        const pendingScore = ScoreWebsockets.pendingScores.get(key);

        Logger.info(`[SS-WS] Received score for player ${player.id} with key ${key}`);

        if (pendingScore?.beatLeaderScore) {
          // Found a matching BeatLeader score, process both
          ScoreWebsockets.clearPendingScore(key);
          await this.processScore(
            score.score,
            score.leaderboard,
            score.score.leaderboardPlayerInfo as unknown as ScoreSaberPlayerToken,
            pendingScore.beatLeaderScore
          );
        } else {
          // No matching BeatLeader score yet, store this one
          const timeoutId = setTimeout(() => {
            const pendingScore = ScoreWebsockets.pendingScores.get(key);
            if (
              pendingScore?.scoreSaberToken &&
              pendingScore.leaderboardToken &&
              pendingScore.player
            ) {
              ScoreWebsockets.clearPendingScore(key);
              this.processScore(
                pendingScore.scoreSaberToken,
                pendingScore.leaderboardToken,
                pendingScore.player
              );
            }
          }, ScoreWebsockets.SCORE_MATCH_TIMEOUT);

          ScoreWebsockets.pendingScores.set(key, {
            scoreSaberToken: score.score,
            leaderboardToken: score.leaderboard,
            player: score.score.leaderboardPlayerInfo as unknown as ScoreSaberPlayerToken,
            timestamp: Date.now(),
            timeoutId,
          });
        }
      },
    });

    connectBeatLeaderWebsocket({
      onScore: async beatLeaderScore => {
        const player = beatLeaderScore.player;
        const leaderboard = beatLeaderScore.leaderboard;

        const key =
          `${player.id}-${leaderboard.song.hash}-${leaderboard.difficulty.difficultyName}-${leaderboard.difficulty.modeName}`.toUpperCase();
        const pendingScore = ScoreWebsockets.pendingScores.get(key);

        Logger.info(`[BL-WS] Received score for player ${player.id} with key ${key}`);

        if (pendingScore?.scoreSaberToken && pendingScore.leaderboardToken && pendingScore.player) {
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
          const timeoutId = setTimeout(() => {
            const pendingScore = ScoreWebsockets.pendingScores.get(key);
            if (pendingScore?.beatLeaderScore) {
              ScoreWebsockets.clearPendingScore(key);
              this.processScore(undefined, undefined, undefined, pendingScore.beatLeaderScore);
            }
          }, ScoreWebsockets.SCORE_MATCH_TIMEOUT);

          ScoreWebsockets.pendingScores.set(key, {
            beatLeaderScore,
            timestamp: Date.now(),
            timeoutId,
          });
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
    const pendingScore = this.pendingScores.get(key);
    if (pendingScore?.timeoutId) {
      clearTimeout(pendingScore.timeoutId);
      pendingScore.timeoutId = undefined;
    }
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
    player?: ScoreSaberPlayerToken,
    beatLeaderScore?: BeatLeaderScoreToken
  ) {
    if (scoreSaberToken && leaderboardToken && player) {
      const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
      const score = getScoreSaberScoreFromToken(scoreSaberToken, leaderboard, player.id);
      const isTop50GlobalScore = await ScoreService.isTop50GlobalScore(score);

      PlayerService.trackPlayer(player.id);
      PlayerService.updatePlayerName(player.id, player.name);

      EventsManager.getListeners().forEach(listener => {
        listener.onScoreReceived?.(score, leaderboard, player, beatLeaderScore, isTop50GlobalScore);
      });
    }
  }
}
