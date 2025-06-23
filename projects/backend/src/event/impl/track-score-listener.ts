import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { DiscordChannels } from "../../bot/bot";
import { sendScoreNotification } from "../../common/score/score.util";
import TrackedScoresMetric from "../../metrics/impl/player/tracked-scores";
import BeatLeaderService from "../../service/beatleader.service";
import MetricsService, { MetricType } from "../../service/metrics.service";
import { PlayerService } from "../../service/player/player.service";
import { ScoreService } from "../../service/score/score.service";
import { EventListener } from "../event-listener";

export class TrackScoreListener implements EventListener {
  async onScoreReceived(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberPlayerToken,
    beatLeaderScoreToken: BeatLeaderScoreToken | undefined,
    isTop50GlobalScore: boolean
  ) {
    const playerInfo = score.playerInfo;

    // Track ScoreSaber score
    const { score: trackedScore, hasPreviousScore } = await ScoreService.trackScoreSaberScore(
      score,
      leaderboard,
      player
    );
    if (trackedScore == undefined) {
      return;
    }

    // Update player daily score stats
    PlayerService.updatePlayerDailyScoreStats(
      score.playerId,
      leaderboard.stars > 0,
      hasPreviousScore
    );

    // Track BeatLeader score if available
    let beatLeaderScore: AdditionalScoreData | undefined;
    if (beatLeaderScoreToken) {
      beatLeaderScore = await BeatLeaderService.trackBeatLeaderScore(
        beatLeaderScoreToken,
        isTop50GlobalScore
      );
    }

    // Prepare notifications to send
    const notifications = [];

    // Always send score flood gate notifications
    notifications.push(
      sendScoreNotification(
        DiscordChannels.SCORE_FLOODGATE_FEED,
        score,
        leaderboard,
        player,
        beatLeaderScore,
        `${playerInfo.name} just set a rank #${score.rank}!`
      )
    );

    // Only send ranked notifications if the map is ranked
    if (leaderboard.stars > 0) {
      // Send #1 notification if applicable
      if (score.rank === 1) {
        notifications.push(
          sendScoreNotification(
            DiscordChannels.NUMBER_ONE_FEED,
            score,
            leaderboard,
            player,
            beatLeaderScore,
            `${playerInfo.name} just set a #1!`
          )
        );
      }

      // Send top 50 notification if applicable
      if (isTop50GlobalScore) {
        notifications.push(
          sendScoreNotification(
            DiscordChannels.TOP_50_SCORES_FEED,
            score,
            leaderboard,
            player,
            beatLeaderScore,
            `${playerInfo.name} just set a new top 50 score!`
          )
        );
      }
    }

    // Send all notifications in parallel
    await Promise.all(notifications);

    // Update metric
    const trackedScoresMetric = (await MetricsService.getMetric(
      MetricType.TRACKED_SCORES
    )) as TrackedScoresMetric;
    trackedScoresMetric.increment();
  }
}
