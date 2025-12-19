import { BeatLeaderScore } from "@ssr/common/model/beatleader-score/beatleader-score";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { DiscordChannels } from "../../bot/bot";
import { sendScoreNotification } from "../../common/score/score.util";
import TrackedScoresMetric from "../../metrics/impl/player/tracked-scores";
import BeatLeaderService from "../../service/beatleader.service";
import CacheService from "../../service/cache.service";
import MetricsService, { MetricType } from "../../service/metrics.service";
import { PlayerHistoryService } from "../../service/player/player-history.service";
import { ScoreCoreService } from "../../service/score/score-core.service";
import { EventListener } from "../event-listener";

export class TrackScoreListener implements EventListener {
  async onScoreReceived(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberLeaderboardPlayerInfoToken,
    beatLeaderScoreToken: BeatLeaderScoreToken | undefined,
    isTop50GlobalScore: boolean
  ) {
    const playerInfo = score.playerInfo;

    // Track BeatLeader score if available
    let beatLeaderScore: BeatLeaderScore | undefined;
    if (beatLeaderScoreToken) {
      beatLeaderScore = await BeatLeaderService.trackBeatLeaderScore(
        beatLeaderScoreToken,
        isTop50GlobalScore
      );
    }

    // Track ScoreSaber score
    const { score: trackedScore, hasPreviousScore } = await ScoreCoreService.trackScoreSaberScore(
      score,
      leaderboard,
      player,
      beatLeaderScore,
      true
    );
    if (trackedScore == undefined) {
      return;
    }

    // Update player daily score stats
    PlayerHistoryService.updatePlayerDailyScoreStats(
      score.playerId,
      leaderboard.stars > 0,
      hasPreviousScore
    );

    // Invalidate player caches
    CacheService.invalidate(`scoresaber:temp-cached-player:${player.id}`);
    CacheService.invalidate(`scoresaber:player:${player.id}:basic`);
    CacheService.invalidate(`scoresaber:player:${player.id}:full`);

    sendScoreNotification(
      DiscordChannels.SCORE_FLOODGATE_FEED,
      score,
      leaderboard,
      player,
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
          player,
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
          player,
          beatLeaderScore,
          `${playerInfo.name} just set a new top 50 score!`
        );
      }
    }

    // Update metric
    const trackedScoresMetric = (await MetricsService.getMetric(MetricType.TRACKED_SCORES)) as
      | TrackedScoresMetric
      | undefined;
    if (trackedScoresMetric) {
      trackedScoresMetric.increment();
    }
  }
}
