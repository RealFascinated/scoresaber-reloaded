import { isScoreSaberV2PlayerToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { describe, expect, test } from "bun:test";
import { parse, stringify } from "devalue";
import { cachedPlayerTokenCacheKey } from "../../src/common/cache-keys";
import { redisClient } from "../../src/common/redis";
import {
  expectBasicPlayerShape,
  expectMiniRankingResponse,
  expectNotFound,
  expectPlayerHistoryResponse,
  expectPlayerPpsResponse,
  expectPlayerRefreshResponse,
  expectPlayerSearchResponse,
  expectScoreSaberScoresPage,
  expectScoresChartResponse,
  expectStatus,
  expectValidationError,
} from "../helpers/assertions";
import {
  TEST_AVATAR,
  TEST_LEADERBOARD_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_NAME,
  UNKNOWN_LEADERBOARD_ID,
  UNKNOWN_PLAYER_ID,
} from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("GET /player/search", () => {
  const app = createTestApp();

  test("returns empty array for short queries", async () => {
    const response = await request(app, "/player/search?query=Te");
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerSearchResponse(body);
    expect((body as { players: unknown[] }).players).toEqual([]);
  });

  test("returns seeded players for a valid query", async () => {
    const response = await request(app, `/player/search?query=${TEST_PLAYER_NAME}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerSearchResponse(body);
    const players = (body as { players: Array<{ id: string }> }).players;
    expect(players.some(player => player.id === TEST_PLAYER_ID)).toBe(true);
  });

  test("recovers from a stale (pre-v2) cached player token", async () => {
    // A v1-shaped token (flat rank/countryRank, no `stats`) — what older code
    // cached under this key before the v2 player migration.
    const staleToken = {
      id: TEST_PLAYER_ID,
      name: TEST_PLAYER_NAME,
      playerNameInGame: TEST_PLAYER_NAME,
      country: "US",
      role: null,
      avatar: TEST_AVATAR,
      avatarVersion: 1,
      permissions: 0,
      banned: false,
      silenced: false,
      inactive: false,
      rank: 100,
      countryRank: 10,
      pp: 100,
      scoreStats: {},
    };
    await redisClient.set(cachedPlayerTokenCacheKey(TEST_PLAYER_ID), stringify(staleToken), "EX", 60 * 60);

    const response = await request(app, `/player/search?query=${TEST_PLAYER_NAME}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerSearchResponse(body);
    const players = (body as { players: Array<{ id: string }> }).players;
    expect(players.some(player => player.id === TEST_PLAYER_ID)).toBe(true);

    // The stale entry was removed and replaced with a valid v2 token.
    const healed = await redisClient.get(cachedPlayerTokenCacheKey(TEST_PLAYER_ID));
    expect(healed).not.toBeNull();
    expect(isScoreSaberV2PlayerToken(parse(healed!))).toBe(true);
  });

  test("rejects overly long query", async () => {
    const response = await request(app, `/player/search?query=${"a".repeat(65)}`);
    await expectValidationError(response);
  });
});

describe("GET /player/:playerId", () => {
  const app = createTestApp();

  test("returns seeded player profile", async () => {
    const response = await request(app, `/player/${TEST_PLAYER_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectBasicPlayerShape(body, TEST_PLAYER_ID);
    expect((body as { name: string }).name).toBe(TEST_PLAYER_NAME);
  });

  test("returns full player profile when requested", async () => {
    const response = await request(app, `/player/${TEST_PLAYER_ID}?type=full`);
    expectStatus(response, 200);

    const body = await response.json();
    expectBasicPlayerShape(body, TEST_PLAYER_ID);
    expect((body as { statistics: unknown }).statistics).toBeDefined();
  });

  test("rejects invalid detail type", async () => {
    const response = await request(app, `/player/${TEST_PLAYER_ID}?type=invalid`);
    await expectValidationError(response);
  });

  test("returns 404 for unknown player", async () => {
    const response = await request(app, `/player/${UNKNOWN_PLAYER_ID}`);
    await expectNotFound(response, UNKNOWN_PLAYER_ID);
  });
});

describe("GET /player/scores-chart/:playerId", () => {
  const app = createTestApp();

  test("returns chart data for seeded player", async () => {
    const response = await request(app, `/player/scores-chart/${TEST_PLAYER_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectScoresChartResponse(body);
    expect((body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(1);
  });

  test("returns empty chart for unknown player", async () => {
    const response = await request(app, `/player/scores-chart/${UNKNOWN_PLAYER_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectScoresChartResponse(body);
    expect((body as { data: unknown[] }).data).toEqual([]);
  });
});

describe("GET /player/pps/:playerId", () => {
  const app = createTestApp();

  test("returns pp breakdown for seeded player", async () => {
    const response = await request(app, `/player/pps/${TEST_PLAYER_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerPpsResponse(body);
    expect((body as { scores: unknown[] }).scores.length).toBeGreaterThanOrEqual(1);
  });

  test("returns 404 for unknown player", async () => {
    const response = await request(app, `/player/pps/${UNKNOWN_PLAYER_ID}`);
    await expectNotFound(response, UNKNOWN_PLAYER_ID);
  });
});

describe("GET /player/refresh/:playerId", () => {
  const app = createTestApp();

  test("returns refresh result for seeded player", async () => {
    const response = await request(app, `/player/refresh/${TEST_PLAYER_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerRefreshResponse(body);
  });
});

describe("GET /player/mini-ranking/:playerId", () => {
  const app = createTestApp();

  test("returns mini ranking payload for seeded player", async () => {
    const response = await request(app, `/player/mini-ranking/${TEST_PLAYER_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectMiniRankingResponse(body);
  });

  test("returns 404 for unknown player", async () => {
    const response = await request(app, `/player/mini-ranking/${UNKNOWN_PLAYER_ID}`);
    await expectNotFound(response, UNKNOWN_PLAYER_ID);
  });
});

describe("GET /player/history/:playerId", () => {
  const app = createTestApp();

  test("returns statistic history rows", async () => {
    const response = await request(app, `/player/history/${TEST_PLAYER_ID}?count=7`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerHistoryResponse(body);
  });

  test("rejects invalid count", async () => {
    const response = await request(app, `/player/history/${TEST_PLAYER_ID}?count=0`);
    await expectValidationError(response);
  });

  test("returns 404 for unknown player", async () => {
    const response = await request(app, `/player/history/${UNKNOWN_PLAYER_ID}`);
    await expectNotFound(response, UNKNOWN_PLAYER_ID);
  });
});

describe("GET /player/score-history/:playerId/:leaderboardId/:page", () => {
  const app = createTestApp();

  test("returns combined score history page", async () => {
    const response = await request(app, `/player/score-history/${TEST_PLAYER_ID}/${TEST_LEADERBOARD_ID}/1`);
    expectStatus(response, 200);

    const body = await response.json();
    expectScoreSaberScoresPage(body, 1);
    expect((body as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects non-numeric page", async () => {
    const response = await request(app, `/player/score-history/${TEST_PLAYER_ID}/${TEST_LEADERBOARD_ID}/abc`);
    await expectValidationError(response);
  });

  test("returns 404 for unknown leaderboard", async () => {
    const response = await request(
      app,
      `/player/score-history/${TEST_PLAYER_ID}/${UNKNOWN_LEADERBOARD_ID}/1`
    );
    await expectNotFound(response);
  });
});
