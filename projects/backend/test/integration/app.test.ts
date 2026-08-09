import { describe, expect, test } from "bun:test";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";
import { expectAppStatistic, expectStatus } from "../helpers/assertions";

describe("GET /", () => {
  const app = createTestApp();

  test("returns backend identity", async () => {
    const response = await request(app, "/");
    expectStatus(response, 200);

    const body = (await response.json()) as { app: string; version: string };
    expect(body.app).toBe("backend");
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
  });
});

describe("GET /health", () => {
  const app = createTestApp();

  test("returns OK", async () => {
    const response = await request(app, "/health");
    expectStatus(response, 200);
    expect(await response.text()).toBe("OK");
  });
});

describe("GET /statistics", () => {
  const app = createTestApp();

  test("returns aggregate counters with velocity fields", async () => {
    const response = await request(app, "/statistics");
    expectStatus(response, 200);

    const body = (await response.json()) as Record<string, unknown>;
    const expectedKeys = [
      "leaderboardCount",
      "trackedScores",
      "scoreHistoryScores",
      "storedReplays",
      "inactivePlayers",
      "activePlayers",
      "uniquePlayersToday",
    ];

    for (const key of expectedKeys) {
      expect(body[key]).toBeDefined();
      expectAppStatistic(body[key]);
    }

    const stats = body as {
      activePlayers: { value: number };
      trackedScores: { value: number };
      leaderboardCount: { value: number };
    };
    expect(stats.activePlayers.value).toBeGreaterThanOrEqual(0);
    expect(stats.trackedScores.value).toBeGreaterThanOrEqual(2);
    expect(stats.leaderboardCount.value).toBeGreaterThanOrEqual(2);
  });
});
