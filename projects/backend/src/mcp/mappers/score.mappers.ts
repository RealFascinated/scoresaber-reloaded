import type { ScoreStatsToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-stats";
import type { McpScoreSummary } from "@ssr/common/schemas/mcp/fragments/score-summary";
import type { McpBeatLeaderScoreStats } from "@ssr/common/schemas/mcp/score/get-beatleader-score-stats";
import type { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import type { TopScoresPageResponse } from "@ssr/common/schemas/response/score/top-scores";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import type { PlayerScore } from "@ssr/common/score/player-score";
import { mcpJsonContent, toMcpScoreSummary, toMcpScoresPage } from "./shared.mappers";

function toMcpBeatLeaderAttemptStats(stats: ScoreStatsToken) {
  return {
    hitTracker: stats.hitTracker,
    accuracyTracker: {
      accLeft: stats.accuracyTracker.accLeft,
      accRight: stats.accuracyTracker.accRight,
      fcAcc: stats.accuracyTracker.fcAcc,
      averagePreswing: stats.accuracyTracker.averagePreswing,
    },
    winTracker: {
      won: stats.winTracker.won,
      endTime: stats.winTracker.endTime,
      nbOfPause: stats.winTracker.nbOfPause,
      totalPauseDuration: stats.winTracker.totalPauseDuration,
      jumpDistance: stats.winTracker.jumpDistance,
      averageHeight: stats.winTracker.averageHeight,
      totalScore: stats.winTracker.totalScore,
      maxScore: stats.winTracker.maxScore,
    },
  };
}

export function toMcpBeatLeaderScoreStats(response: ScoreStatsResponse): McpBeatLeaderScoreStats {
  return {
    current: toMcpBeatLeaderAttemptStats(response.current),
    previous: response.previous ? toMcpBeatLeaderAttemptStats(response.previous) : undefined,
  };
}

export function mcpScoreResult(item: PlayerScore<ScoreSaberScore>) {
  const summary: McpScoreSummary = toMcpScoreSummary(
    item.score,
    item.leaderboard,
    item.score.playerInfo?.name
  );
  return mcpJsonContent(summary);
}

export function mcpTopScoresPageResult(response: TopScoresPageResponse) {
  return mcpJsonContent(toMcpScoresPage(response));
}

export function mcpBeatLeaderScoreStatsResult(response: ScoreStatsResponse) {
  return mcpJsonContent(toMcpBeatLeaderScoreStats(response));
}
