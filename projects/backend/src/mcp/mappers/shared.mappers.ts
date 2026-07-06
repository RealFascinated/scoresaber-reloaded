import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { McpScoresPage } from "@ssr/common/schemas/mcp/fragments/page";
import type { McpSongRef } from "@ssr/common/schemas/mcp/fragments/song-ref";
import type { PaginationMetadata } from "@ssr/common/schemas/pagination";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import type { PlayerScore } from "@ssr/common/score/player-score";

export function toMcpPlayerSummary(player: ScoreSaberPlayer) {
  return {
    id: player.id,
    name: player.name,
    rank: player.rank,
    country: player.country,
    pp: player.pp,
  };
}

export function toMcpSongRef(leaderboard: ScoreSaberLeaderboard): McpSongRef {
  return {
    leaderboardId: leaderboard.id,
    songName: leaderboard.songName,
    songAuthor: leaderboard.songAuthorName,
    songHash: leaderboard.songHash,
    stars: leaderboard.stars,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
  };
}

export function toMcpScoreSummary(
  score: ScoreSaberScore,
  leaderboard: ScoreSaberLeaderboard,
  playerName?: string
) {
  return {
    scoreId: score.scoreId,
    playerId: score.playerId,
    pp: score.pp,
    accuracy: score.accuracy,
    rank: score.rank,
    score: score.score,
    misses: score.misses,
    modifiers: score.modifiers,
    timestamp: score.timestamp,
    song: toMcpSongRef(leaderboard),
    playerName: playerName ?? score.playerInfo?.name,
  };
}

export function toMcpScoresPage(response: {
  items: PlayerScore<ScoreSaberScore>[];
  metadata: PaginationMetadata;
}): McpScoresPage {
  return {
    items: response.items.map(item =>
      toMcpScoreSummary(item.score, item.leaderboard, item.score.playerInfo?.name)
    ),
    metadata: response.metadata,
  };
}

export function mcpJsonContent(data: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}
