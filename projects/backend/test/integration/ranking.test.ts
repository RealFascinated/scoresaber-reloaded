import { describe, expect, test } from "bun:test";
import { expectPaginationMetadata, expectStatus } from "../helpers/assertions";
import {
  TEST_AVATAR,
  TEST_INACTIVE_PLAYER_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_NAME,
  TEST_PLAYER_TWO_ID,
} from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("Ranking API integration", () => {
  const app = createTestApp();

  describe("GET /ranking/:page", () => {
    test("returns player rankings page", async () => {
      const response = await request(app, "/ranking/1");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: Array<{ id: string }>; metadata: unknown };
      expect(body.items.some(player => player.id === TEST_PLAYER_ID)).toBe(true);
      // Inactive players are excluded by default.
      expect(body.items.some(player => player.id === TEST_INACTIVE_PLAYER_ID)).toBe(false);
      expectPaginationMetadata(body.metadata, 1);
    });

    test("accepts country filter", async () => {
      const response = await request(app, "/ranking/1?country=US");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: Array<{ country: string }> };
      expect(body.items.every(player => player.country === "US")).toBe(true);
    });

    test("accepts includeInactives filter", async () => {
      const response = await request(app, "/ranking/1?includeInactives=true");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: Array<{ id: string }> };
      expect(body.items.some(player => player.id === TEST_PLAYER_ID)).toBe(true);
      expect(body.items.some(player => player.id === TEST_PLAYER_TWO_ID)).toBe(true);
      // The flag is what brings the inactive fixture player into the results.
      expect(body.items.some(player => player.id === TEST_INACTIVE_PLAYER_ID)).toBe(true);
    });

    test("returns empty items for an unmatched country filter", async () => {
      const response = await request(app, "/ranking/1?country=ZZ");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: unknown[]; metadata: unknown };
      expect(body.items).toEqual([]);
      expectPaginationMetadata(body.metadata, 1);
    });

    test("returns empty items for short search queries", async () => {
      const response = await request(app, "/ranking/1?search=Te");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: unknown[]; metadata: unknown };
      expect(body.items).toEqual([]);
      expectPaginationMetadata(body.metadata, 1);
    });

    test("returns 422 for invalid page", async () => {
      const response = await request(app, "/ranking/not-a-page");
      expectStatus(response, 422);
    });
  });

  describe("GET /ranking/medals/:page", () => {
    test("returns medal rankings with seeded player avatar and medal ranks", async () => {
      const response = await request(app, "/ranking/medals/1");
      expectStatus(response, 200);

      const body = (await response.json()) as {
        items: Array<{
          id: string;
          name: string;
          avatar: string;
          medals: number;
          medalsRank: number;
          medalsCountryRank: number;
        }>;
        metadata: unknown;
      };
      expectPaginationMetadata(body.metadata, 1);

      const seededPlayer = body.items.find(player => player.id === TEST_PLAYER_ID);
      expect(seededPlayer?.name).toBe(TEST_PLAYER_NAME);
      expect(seededPlayer?.avatar).toBe(TEST_AVATAR);
      expect(seededPlayer?.medals).toBeGreaterThan(0);
      expect(seededPlayer?.medalsRank).toBeGreaterThan(0);
      expect(seededPlayer?.medalsCountryRank).toBeGreaterThan(0);
    });

    test("accepts country filter", async () => {
      const response = await request(app, "/ranking/medals/1?country=US");
      expectStatus(response, 200);

      const body = (await response.json()) as {
        items: Array<{ id: string; country: string | null }>;
        metadata: unknown;
      };
      expect(body.items.every(player => player.country === "US")).toBe(true);
      expect(body.items.some(player => player.id === TEST_PLAYER_ID)).toBe(true);
    });

    test("returns empty page when country has no medal players", async () => {
      const response = await request(app, "/ranking/medals/1?country=ZZ");
      expectStatus(response, 200);

      const body = (await response.json()) as { items: unknown[]; metadata: unknown };
      expect(body.items).toEqual([]);
      expectPaginationMetadata(body.metadata, 1);
    });

    test("returns 422 for invalid page", async () => {
      const response = await request(app, "/ranking/medals/not-a-page");
      expectStatus(response, 422);
    });
  });
});
