import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import TrackedScoresMetric from "../../metrics/impl/player/tracked-scores";
import BeatLeaderService from "../../service/beatleader.service";
import MetricsService, { MetricType } from "../../service/metrics.service";
import { PlayerHistoryService } from "../../service/player/player-history.service";
import { ScoreService } from "../../service/score/score.service";
import { EventListener } from "../event-listener";

export class TrackScoreListener implements EventListener {
  async onScoreReceived(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberPlayerToken,
    beatLeaderScore: BeatLeaderScoreToken | undefined,
    isTop50GlobalScore: boolean
  ) {
    // Track ScoreSaber score
    const tracked = await ScoreService.trackScoreSaberScore(score, leaderboard, player);
    if (tracked.score == undefined) {
      return;
    }

    await PlayerHistoryService.updatePlayerScoresSet({
      score: score,
      leaderboard: leaderboard,
    });

    // Track BeatLeader score if available
    if (beatLeaderScore) {
      await BeatLeaderService.trackBeatLeaderScore(beatLeaderScore, isTop50GlobalScore);
    }

    // Update metric
    const trackedScoresMetric = (await MetricsService.getMetric(
      MetricType.TRACKED_SCORES
    )) as TrackedScoresMetric;
    trackedScoresMetric.increment();
  }
}
