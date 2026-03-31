import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { DiscordChannels } from "../../bot/bot";
import { sendScoreNotification } from "../../common/score/score.util";
import TrackedScoresMetric from "../../metrics/impl/player/tracked-scores";
import BeatLeaderService from "../../service/beatleader.service";
import CacheService from "../../service/cache.service";
import MetricsService, { MetricType } from "../../service/metrics.service";
import { PlayerHistoryService } from "../../service/player/player-history.service";
import { ScoreCoreService } from "../../service/score/score-core.service";
import { WebsocketManager } from "../../websocket/websocket-manager";
import { EventListener } from "../event-listener";

export class TrackScoreListener implements EventListener {
  async onScoreReceived(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberLeaderboardPlayerInfo,
    beatLeaderScoreToken: BeatLeaderScoreToken | undefined,
    isTop50GlobalScore: boolean
  ) {
    const playerInfo = score.playerInfo!;

    let beatLeaderScore: BeatLeaderScore | undefined;
    if (beatLeaderScoreToken) {
      beatLeaderScore = await BeatLeaderService.trackBeatLeaderScore(
        beatLeaderScoreToken,
        isTop50GlobalScore
      );
    }

    const { score: trackedScore, hasPreviousScore } = await ScoreCoreService.trackScoreSaberScore(
      score,
      beatLeaderScore,
      leaderboard,
      true
    );
    if (trackedScore == undefined) {
      return;
    }

    // Update player daily score stats
    PlayerHistoryService.updatePlayerDailyScoreStats(score.playerId, leaderboard.stars > 0, hasPreviousScore);

    // Invalidate player caches
    CacheService.invalidate(`scoresaber:temp-cached-player:${player.id}`);
    CacheService.invalidate(`scoresaber:player:${player.id}:basic`);
    CacheService.invalidate(`scoresaber:player:${player.id}:full`);

    sendScoreNotification(
      DiscordChannels.SCORE_FLOODGATE_FEED,
      score,
      leaderboard,
      beatLeaderScore,
      `${playerInfo.name} just set a rank #${score.rank}!`
    );

    // Only send ranked notifications if the map is ranked
    if (leaderboard.stars > 0) {
      // Send #1 notification if applicable
      if (score.rank === 1) {
        sendScoreNotification(
          DiscordChannels.NUMBER_ONE_FEED,
          score,
          leaderboard,
          beatLeaderScore,
          `${playerInfo.name} just set a #1!`
        );
      }

      // Send top 50 notification if applicable
      if (isTop50GlobalScore) {
        sendScoreNotification(
          DiscordChannels.TOP_50_SCORES_FEED,
          score,
          leaderboard,
          beatLeaderScore,
          `${playerInfo.name} just set a new top 50 score!`
        );
      }
    }

    // Update metric
    const trackedScoresMetric = MetricsService.getMetric<TrackedScoresMetric>(MetricType.TRACKED_SCORES);
    trackedScoresMetric?.increment();

    // Publish the score to the websocket
    WebsocketManager.get<PlayerScore>("score")?.publish({
      score: await ScoreCoreService.insertScoreData(trackedScore, leaderboard, {
        insertBeatLeaderScore: true,
      }),
      leaderboard: leaderboard,
    });
  }
}
