import { describe, expect, test } from "bun:test";
import { expectPaginationMetadata, expectStatus } from "../helpers/assertions";
import {
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_SONG_HASH,
  UNKNOWN_LEADERBOARD_ID,
} from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("Leaderboard API integration", () => {
  const app = createTestApp();

  describe("GET /leaderboard/search", () => {
    test("returns paginated leaderboards with default filters", async () => {
      const response = await request(app, "/leaderboard/search?page=1");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: Array<{ id: number }>; metadata: unknown };
      expect(body.items.some(item => item.id === TEST_LEADERBOARD_ID)).toBe(true);
      expectPaginationMetadata(body.metadata, 1);
    });

    test("filters ranked leaderboards", async () => {
      const response = await request(app, "/leaderboard/search?page=1&ranked=true");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: Array<{ ranked: boolean }> };
      expect(body.items.every(item => item.ranked)).toBe(true);
    });

    test("filters by star range and category", async () => {
      const response = await request(
        app,
        "/leaderboard/search?page=1&ranked=true&minStars=8&maxStars=9&category=star_difficulty&sort=desc"
      );
      expectStatus(response, 200);

      const body = (await response.json()) as { items: Array<{ id: number }> };
      expect(body.items.some(item => item.id === TEST_LEADERBOARD_ID)).toBe(true);
    });

    test("searches leaderboards by query text", async () => {
      const response = await request(app, "/leaderboard/search?page=1&query=Test%20Song");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: Array<{ songName: string }> };
      expect(body.items.some(item => item.songName === "Test Song")).toBe(true);
    });

    test("returns 422 for non-numeric page", async () => {
      const response = await request(app, "/leaderboard/search?page=not-a-number");
      expectStatus(response, 422);
    });

    test("returns 422 for invalid category", async () => {
      const response = await request(app, "/leaderboard/search?page=1&category=invalid");
      expectStatus(response, 422);
    });

    test("returns 422 for invalid sort direction", async () => {
      const response = await request(app, "/leaderboard/search?page=1&sort=sideways");
      expectStatus(response, 422);
    });
  });

  describe("GET /leaderboard/ranking-queue", () => {
    test("returns ranking queue buckets", async () => {
      const response = await request(app, "/leaderboard/ranking-queue");
      expectStatus(response, 200);

      const body = (await response.json()) as {
        nextInQueue: unknown[];
        openRankUnrank: unknown[];
        all: unknown[];
      };
      expect(Array.isArray(body.nextInQueue)).toBe(true);
      expect(Array.isArray(body.openRankUnrank)).toBe(true);
      expect(Array.isArray(body.all)).toBe(true);
    });
  });

  describe("GET /leaderboard/by-id/:leaderboardId", () => {
    test("returns seeded leaderboard with optional beatsaver map", async () => {
      const response = await request(app, `/leaderboard/by-id/${TEST_LEADERBOARD_ID}`);
      expectStatus(response, 200);

      const body = (await response.json()) as {
        leaderboard: { id: number; songName: string; songHash: string };
        beatsaver?: { id: string };
      };
      expect(body.leaderboard.id).toBe(TEST_LEADERBOARD_ID);
      expect(body.leaderboard.songName).toBe("Test Song");
      expect(body.leaderboard.songHash.toLowerCase()).toBe(TEST_SONG_HASH.toLowerCase());
      if (body.beatsaver) {
        expect(typeof body.beatsaver.id).toBe("string");
      }
    });

    test("returns 404 for missing leaderboard", async () => {
      const response = await request(app, `/leaderboard/by-id/${UNKNOWN_LEADERBOARD_ID}`);
      expectStatus(response, 404);
    });

    test("returns 422 for invalid leaderboard id", async () => {
      const response = await request(app, "/leaderboard/by-id/not-a-number");
      expectStatus(response, 422);
    });
  });

  describe("GET /leaderboard/by-id/:leaderboardId/star-history", () => {
    test("returns star history for seeded leaderboard", async () => {
      const response = await request(app, `/leaderboard/by-id/${TEST_LEADERBOARD_ID}/star-history`);
      expectStatus(response, 200);

      const body = (await response.json()) as Array<{ previousStars: number; newStars: number }>;
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]?.previousStars).toBe(8);
      expect(body[0]?.newStars).toBe(8.5);
    });

    test("returns empty history for leaderboard without star changes", async () => {
      const response = await request(app, `/leaderboard/by-id/${TEST_LEADERBOARD_QUALIFIED_ID}/star-history`);
      expectStatus(response, 200);
      expect(await response.json()).toEqual([]);
    });

    test("returns 404 for missing leaderboard", async () => {
      const response = await request(app, `/leaderboard/by-id/${UNKNOWN_LEADERBOARD_ID}/star-history`);
      expectStatus(response, 404);
    });

    test("returns 422 for invalid leaderboard id", async () => {
      const response = await request(app, "/leaderboard/by-id/not-a-number/star-history");
      expectStatus(response, 422);
    });
  });

  describe("GET /leaderboard/by-hash/:hash/:difficulty/:characteristic", () => {
    test("returns leaderboard by hash", async () => {
      const response = await request(app, `/leaderboard/by-hash/${TEST_SONG_HASH}/ExpertPlus/Standard`);
      expectStatus(response, 200);

      const body = (await response.json()) as { leaderboard: { id: number } };
      expect(body.leaderboard.id).toBe(TEST_LEADERBOARD_ID);
    });

    test("returns 404 when difficulty does not exist for hash", async () => {
      const response = await request(app, `/leaderboard/by-hash/${TEST_SONG_HASH}/Hard/Standard`);
      expectStatus(response, 404);
    });

    test("returns 404 for unknown hash", async () => {
      const response = await request(
        app,
        "/leaderboard/by-hash/00000000000000000000000000000000/ExpertPlus/Standard"
      );
      expectStatus(response, 404);
    });

    test("returns 422 for invalid difficulty", async () => {
      const response = await request(app, `/leaderboard/by-hash/${TEST_SONG_HASH}/NotADifficulty/Standard`);
      expectStatus(response, 422);
    });

    test("returns 422 for invalid characteristic", async () => {
      const response = await request(
        app,
        `/leaderboard/by-hash/${TEST_SONG_HASH}/ExpertPlus/NotACharacteristic`
      );
      expectStatus(response, 422);
    });
  });
});
