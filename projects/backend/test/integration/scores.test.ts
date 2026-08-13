import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { describe, expect, test } from "bun:test";
import {
  expectAccSaberScoresPage,
  expectLeaderboardScoresResponse,
  expectNotFound,
  expectPlayerScore,
  expectPlayerScorePage,
  expectScoreHistoryGraph,
  expectScoreSaberScoresPage,
  expectStatus,
  expectValidationError,
} from "../helpers/assertions";
import {
  TEST_LEADERBOARD_ID,
  TEST_PLAYER_ID,
  TEST_SCORE_ID,
  UNKNOWN_LEADERBOARD_ID,
  UNKNOWN_PLAYER_ID,
  UNKNOWN_SCORE_ID,
} from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("GET /scores/:scoreId", () => {
  const app = createTestApp();

  test("returns seeded score", async () => {
    const response = await request(app, `/scores/${TEST_SCORE_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerScore(body);
    expect((body as { score: { scoreId: number } }).score.scoreId).toBe(TEST_SCORE_ID);
    expect((body as { score: { playerId: string } }).score.playerId).toBe(TEST_PLAYER_ID);
  });

  test("returns 404 for unknown score", async () => {
    const response = await request(app, `/scores/${UNKNOWN_SCORE_ID}`);
    await expectNotFound(response);
  });

  test("rejects non-numeric score id", async () => {
    const response = await request(app, "/scores/not-a-number");
    expect([400, 422]).toContain(response.status);
  });
});

describe("GET /scores/player/scoresaber/:playerId/:sort/:page", () => {
  const app = createTestApp();

  test("returns paginated live scores page", async () => {
    const response = await request(app, `/scores/player/scoresaber/${TEST_PLAYER_ID}/top/1`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerScorePage(body, 1);
  });

  test("rejects invalid sort", async () => {
    const response = await request(app, `/scores/player/scoresaber/${TEST_PLAYER_ID}/invalid/1`);
    await expectValidationError(response);
  });
});

describe("GET /scores/player/accsaber/:playerId/:page", () => {
  const app = createTestApp();

  test("returns paginated accsaber scores page", async () => {
    const response = await request(app, `/scores/player/accsaber/${TEST_PLAYER_ID}/1`);
    expectStatus(response, 200);

    const body = await response.json();
    expectAccSaberScoresPage(body, 1);
  });

  test("rejects invalid score type", async () => {
    const response = await request(app, `/scores/player/accsaber/${TEST_PLAYER_ID}/1?type=invalid`);
    await expectValidationError(response);
  });
});

describe("GET /scores/player/ssr/:playerId/:field/:direction/:page", () => {
  const app = createTestApp();

  test("returns paginated SSR scores", async () => {
    const response = await request(app, `/scores/player/ssr/${TEST_PLAYER_ID}/pp/desc/1`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerScorePage(body, 1);
    expect((body as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects invalid sort field", async () => {
    const response = await request(app, `/scores/player/ssr/${TEST_PLAYER_ID}/not-a-field/desc/1`);
    await expectValidationError(response);
  });

  test("rejects invalid sort direction", async () => {
    const response = await request(app, `/scores/player/ssr/${TEST_PLAYER_ID}/pp/invalid/1`);
    await expectValidationError(response);
  });
});

describe("GET /scores/player/medals/:playerId/:field/:direction/:page", () => {
  const app = createTestApp();

  test("returns paginated medal scores", async () => {
    const response = await request(app, `/scores/player/medals/${TEST_PLAYER_ID}/medals/desc/1`);
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerScorePage(body, 1);
    expect((body as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects invalid medal sort field", async () => {
    const response = await request(app, `/scores/player/medals/${TEST_PLAYER_ID}/pp/desc/1`);
    await expectValidationError(response);
  });
});

describe("GET /scores/history-graph/:playerId/:leaderboardId", () => {
  const app = createTestApp();

  test("returns accuracy series for seeded map", async () => {
    const response = await request(app, `/scores/history-graph/${TEST_PLAYER_ID}/${TEST_LEADERBOARD_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectScoreHistoryGraph(body);
    expect((body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  test("rejects non-numeric leaderboard id", async () => {
    const response = await request(app, `/scores/history-graph/${TEST_PLAYER_ID}/not-a-number`);
    await expectValidationError(response);
  });

  test("returns empty graph for unknown player", async () => {
    const response = await request(app, `/scores/history-graph/${UNKNOWN_PLAYER_ID}/${TEST_LEADERBOARD_ID}`);
    expectStatus(response, 200);

    const body = await response.json();
    expectScoreHistoryGraph(body);
    expect(body).toEqual([]);
  });
});

describe("GET /scores/leaderboard/:leaderboardId/:page", () => {
  const app = createTestApp();

  test("returns leaderboard scores when upstream data is available", async () => {
    const response = await request(app, `/scores/leaderboard/${TEST_LEADERBOARD_ID}/1`);
    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
      const body = await response.json();
      expectLeaderboardScoresResponse(body, 1);
    }
  });

  test("returns 404 for unknown leaderboard", async () => {
    const response = await request(app, `/scores/leaderboard/${UNKNOWN_LEADERBOARD_ID}/1`);
    await expectNotFound(response);
  });

  test("rejects non-numeric page", async () => {
    const response = await request(app, `/scores/leaderboard/${TEST_LEADERBOARD_ID}/abc`);
    await expectValidationError(response);
  });
});

describe("POST /scores/friend/leaderboard/:leaderboardId/:page", () => {
  const app = createTestApp();

  test("returns friend scores for seeded leaderboard", async () => {
    const response = await request(app, `/scores/friend/leaderboard/${TEST_LEADERBOARD_ID}/1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ friendIds: [TEST_PLAYER_ID] }),
    });
    expectStatus(response, 200);

    const body = await response.json();
    expectScoreSaberScoresPage(body, 1);
    expect((body as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects empty friend list", async () => {
    const response = await request(app, `/scores/friend/leaderboard/${TEST_LEADERBOARD_ID}/1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ friendIds: [] }),
    });
    await expectValidationError(response);
  });

  test("rejects too many friends", async () => {
    const response = await request(app, `/scores/friend/leaderboard/${TEST_LEADERBOARD_ID}/1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        friendIds: Array.from({ length: SHARED_CONSTS.maxFriends + 2 }, (_, index) =>
          String(index).padStart(32, "0")
        ),
      }),
    });
    await expectValidationError(response);
  });

  test("returns 404 for unknown leaderboard", async () => {
    const response = await request(app, `/scores/friend/leaderboard/${UNKNOWN_LEADERBOARD_ID}/1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ friendIds: [TEST_PLAYER_ID] }),
    });
    await expectNotFound(response);
  });
});

describe("GET /scores/top/:page", () => {
  const app = createTestApp();

  test("returns top scores page", async () => {
    const response = await request(app, "/scores/top/1");
    expectStatus(response, 200);

    const body = await response.json();
    expectPlayerScorePage(body, 1);
    expect((body as { items: Array<{ score: { scoreId: number } }> }).items[0]?.score.scoreId).toBe(
      TEST_SCORE_ID
    );
  });

  test("rejects non-numeric page", async () => {
    const response = await request(app, "/scores/top/not-a-page");
    await expectValidationError(response);
  });
});
