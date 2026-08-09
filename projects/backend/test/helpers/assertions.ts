import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { expect } from "bun:test";
import type { TestResponse } from "./request";

export function expectStatus(response: TestResponse, status: number): void {
  expect(response.status).toBe(status);
}

export function expectOneOfStatuses(response: TestResponse, statuses: number[]): void {
  expect(statuses).toContain(response.status);
}

export async function expectValidationError(response: TestResponse): Promise<void> {
  expectStatus(response, 422);
  const body = await response.json();
  if (Array.isArray(body)) {
    expect(body.length).toBeGreaterThan(0);
    return;
  }

  const error = body as { message?: string };
  expect(typeof error.message).toBe("string");
  expect(error.message!.length).toBeGreaterThan(0);
}

export async function expectNotFound(response: TestResponse, messageIncludes?: string): Promise<void> {
  expectStatus(response, 404);
  const body = (await response.json()) as { statusCode: number; message: string };
  expect(body.statusCode).toBe(404);
  expect(typeof body.message).toBe("string");
  if (messageIncludes) {
    expect(body.message).toContain(messageIncludes);
  }
}

export function expectPlaylistShape(body: unknown): asserts body is Playlist {
  const playlist = body as Playlist;
  expect(typeof playlist.playlistTitle).toBe("string");
  expect(typeof playlist.playlistAuthor).toBe("string");
  expect(Array.isArray(playlist.songs)).toBe(true);
}

export function expectPaginationMetadata(metadata: unknown, page: number): void {
  const meta = metadata as {
    totalPages: number;
    totalItems: number;
    page: number;
    itemsPerPage: number;
  };
  expect(typeof meta.totalPages).toBe("number");
  expect(typeof meta.totalItems).toBe("number");
  expect(meta.page).toBe(page);
  expect(typeof meta.itemsPerPage).toBe("number");
}

export function expectAppStatistic(value: unknown): void {
  const stat = value as { value: number; velocity: number };
  expect(typeof stat.value).toBe("number");
  expect(typeof stat.velocity).toBe("number");
}

export function expectPlayerSearchResponse(body: unknown): void {
  const response = body as { players: unknown[] };
  expect(Array.isArray(response.players)).toBe(true);
}

export function expectBasicPlayerShape(body: unknown, playerId: string): void {
  const player = body as {
    id: string;
    name: string;
    avatar: string;
    country: string;
    rank: number;
    countryRank: number;
    pp: number;
    medals: number;
    inactive: boolean;
    banned: boolean;
    trackedSince: string;
    joinedDate: string;
  };
  expect(player.id).toBe(playerId);
  expect(typeof player.name).toBe("string");
  expect(typeof player.avatar).toBe("string");
  expect(typeof player.country).toBe("string");
  expect(typeof player.rank).toBe("number");
  expect(typeof player.countryRank).toBe("number");
  expect(typeof player.pp).toBe("number");
  expect(typeof player.medals).toBe("number");
  expect(typeof player.inactive).toBe("boolean");
  expect(typeof player.banned).toBe("boolean");
  expect(player.trackedSince).toBeDefined();
  expect(player.joinedDate).toBeDefined();
}

export function expectScoresChartResponse(body: unknown): void {
  const response = body as {
    data: Array<{
      accuracy: number;
      stars: number;
      pp: number;
      timestamp: string;
      leaderboardId: number;
      leaderboardName: string;
      leaderboardDifficulty: string;
    }>;
  };
  expect(Array.isArray(response.data)).toBe(true);
  for (const point of response.data) {
    expect(typeof point.accuracy).toBe("number");
    expect(typeof point.stars).toBe("number");
    expect(typeof point.pp).toBe("number");
    expect(typeof point.leaderboardId).toBe("number");
    expect(typeof point.leaderboardName).toBe("string");
    expect(typeof point.leaderboardDifficulty).toBe("string");
  }
}

export function expectPlayerPpsResponse(body: unknown): void {
  const response = body as {
    scores: Array<{ pp: number; weight: number; scoreId: number }>;
  };
  expect(Array.isArray(response.scores)).toBe(true);
  for (const score of response.scores) {
    expect(typeof score.pp).toBe("number");
    expect(typeof score.weight).toBe("number");
    expect(typeof score.scoreId).toBe("number");
  }
}

export function expectPlayerRefreshResponse(body: unknown): void {
  const response = body as { result: boolean };
  expect(typeof response.result).toBe("boolean");
}

export function expectMiniRankingResponse(body: unknown): void {
  const response = body as { globalRankings: unknown[]; countryRankings: unknown[] };
  expect(Array.isArray(response.globalRankings)).toBe(true);
  expect(Array.isArray(response.countryRankings)).toBe(true);
}

export function expectPlayerHistoryResponse(body: unknown): void {
  expect(typeof body).toBe("object");
  expect(body).not.toBeNull();
  const entries = Object.entries(body as Record<string, { pp?: number | null; rank?: number | null }>);
  expect(entries.length).toBeGreaterThan(0);
  for (const [date, history] of entries) {
    expect(typeof date).toBe("string");
    expect(history).toBeDefined();
  }
}

export function expectScoreSaberScoresPage(body: unknown, page: number): void {
  const response = body as { items: unknown[]; metadata: unknown };
  expect(Array.isArray(response.items)).toBe(true);
  expectPaginationMetadata(response.metadata, page);
}

export function expectPlayerScorePage(body: unknown, page: number): void {
  const response = body as {
    items: Array<{
      score: { scoreId: number; playerId: string; leaderboardId: number };
      leaderboard: { id: number; songName: string };
    }>;
    metadata: unknown;
  };
  expect(Array.isArray(response.items)).toBe(true);
  expectPaginationMetadata(response.metadata, page);
  for (const item of response.items) {
    expect(typeof item.score.scoreId).toBe("number");
    expect(typeof item.score.playerId).toBe("string");
    expect(typeof item.score.leaderboardId).toBe("number");
    expect(typeof item.leaderboard.id).toBe("number");
    expect(typeof item.leaderboard.songName).toBe("string");
  }
}

export function expectPlayerScore(body: unknown): void {
  const response = body as {
    score: { scoreId: number; playerId: string; leaderboardId: number; score: number; pp: number };
    leaderboard: { id: number; songName: string; songHash: string };
  };
  expect(typeof response.score.scoreId).toBe("number");
  expect(typeof response.score.playerId).toBe("string");
  expect(typeof response.score.leaderboardId).toBe("number");
  expect(typeof response.score.score).toBe("number");
  expect(typeof response.score.pp).toBe("number");
  expect(typeof response.leaderboard.id).toBe("number");
  expect(typeof response.leaderboard.songName).toBe("string");
  expect(typeof response.leaderboard.songHash).toBe("string");
}

export function expectScoreHistoryGraph(body: unknown): void {
  const response = body as Array<{ timestamp: string; accuracy: number }>;
  expect(Array.isArray(response)).toBe(true);
  for (const point of response) {
    expect(point.timestamp).toBeDefined();
    expect(typeof point.accuracy).toBe("number");
  }
}

export function expectLeaderboardScoresResponse(body: unknown, page: number): void {
  const response = body as {
    scores: unknown[];
    leaderboard: { id: number };
    metadata: unknown;
  };
  expect(Array.isArray(response.scores)).toBe(true);
  expect(typeof response.leaderboard.id).toBe("number");
  expectPaginationMetadata(response.metadata, page);
}

export function expectAccSaberScoresPage(body: unknown, page: number): void {
  const response = body as { items: unknown[]; metadata: unknown };
  expect(Array.isArray(response.items)).toBe(true);
  expectPaginationMetadata(response.metadata, page);
}
