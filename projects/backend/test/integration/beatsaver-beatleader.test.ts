import { describe, expect, test } from "bun:test";
import { expectStatus } from "../helpers/assertions";
import {
  TEST_BEATLEADER_SCORE_ID,
  TEST_SONG_HASH,
  TEST_SONG_HASH_SHA1,
  UNKNOWN_SCORE_ID,
} from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

describe("BeatSaver API integration", () => {
  const app = createTestApp();

  describe("GET /beatsaver/map/:hash/:difficulty/:characteristic", () => {
    test("returns seeded map details", async () => {
      const response = await request(app, `/beatsaver/map/${TEST_SONG_HASH}/ExpertPlus/Standard`);
      expectStatus(response, 200);

      const body = (await response.json()) as {
        id: string;
        name: string;
        difficulty: { difficulty: string; characteristic: string };
      };
      expect(body.id).toBe("testmap");
      expect(body.name).toBe("Test Song");
      expect(body.difficulty.difficulty).toBe("ExpertPlus");
      expect(body.difficulty.characteristic).toBe("Standard");
    });

    test("returns seeded map details for a 40-character (SHA1) hash", async () => {
      const response = await request(app, `/beatsaver/map/${TEST_SONG_HASH_SHA1}/ExpertPlus/Standard`);
      expectStatus(response, 200);

      const body = (await response.json()) as {
        id: string;
        name: string;
        difficulty: { difficulty: string; characteristic: string };
      };
      expect(body.id).toBe("testmap-sha1");
      expect(body.name).toBe("Test Song SHA1");
      expect(body.difficulty.difficulty).toBe("ExpertPlus");
      expect(body.difficulty.characteristic).toBe("Standard");
    });

    test("returns 404 for an unknown 40-character hash", async () => {
      const response = await request(
        app,
        "/beatsaver/map/0000000000000000000000000000000000000000/ExpertPlus/Standard"
      );
      expectStatus(response, 404);
    });

    test("returns 404 when map is not cached", async () => {
      const response = await request(
        app,
        "/beatsaver/map/00000000000000000000000000000000/ExpertPlus/Standard"
      );
      expectStatus(response, 404);
    });

    test("returns 404 when difficulty is missing on cached map", async () => {
      const response = await request(app, `/beatsaver/map/${TEST_SONG_HASH}/Hard/Standard`);
      expectStatus(response, 404);
    });

    test("returns 422 for invalid hash format", async () => {
      const response = await request(app, "/beatsaver/map/not-a-valid-hash/ExpertPlus/Standard");
      expectStatus(response, 422);
    });

    test("returns 422 for invalid difficulty", async () => {
      const response = await request(app, `/beatsaver/map/${TEST_SONG_HASH}/NotADifficulty/Standard`);
      expectStatus(response, 422);
    });

    test("returns 422 for invalid characteristic", async () => {
      const response = await request(app, `/beatsaver/map/${TEST_SONG_HASH}/ExpertPlus/NotACharacteristic`);
      expectStatus(response, 422);
    });
  });
});

describe("BeatLeader API integration", () => {
  const app = createTestApp();

  describe("GET /beatleader/scorestats/:scoreId", () => {
    test("returns 422 for invalid score id", async () => {
      const response = await request(app, "/beatleader/scorestats/not-a-number");
      expectStatus(response, 422);
    });

    test("returns live score stats for the seeded score", async () => {
      const response = await request(app, `/beatleader/scorestats/${TEST_BEATLEADER_SCORE_ID}`);
      expectStatus(response, 200);

      const body = (await response.json()) as {
        current: {
          hitTracker: { maxCombo: number };
          accuracyTracker: { fcAcc: number };
          winTracker: { won: boolean };
          scoreGraphTracker: { graph: number[] };
        };
        previous: unknown;
      };
      expect(typeof body.current.hitTracker.maxCombo).toBe("number");
      expect(typeof body.current.accuracyTracker.fcAcc).toBe("number");
      expect(typeof body.current.winTracker.won).toBe("boolean");
      expect(Array.isArray(body.current.scoreGraphTracker.graph)).toBe(true);
      expect(body.previous).toBeUndefined();
    });

    test(
      "returns 404 for unknown score",
      async () => {
        const response = await request(app, `/beatleader/scorestats/${UNKNOWN_SCORE_ID}`);
        expectStatus(response, 404);
      },
      { timeout: 30_000 }
    );
  });

  describe("GET /beatleader/replay/:scoreId", () => {
    test("redirects to replay CDN for seeded score", async () => {
      const response = await request(app, `/beatleader/replay/${TEST_BEATLEADER_SCORE_ID}.bsor`, {
        redirect: "manual",
      });
      expectStatus(response, 302);
      expect(response.headers.get("location")).toContain(String(TEST_BEATLEADER_SCORE_ID));
    });

    test("returns 404 for unknown replay", async () => {
      const response = await request(app, "/beatleader/replay/999999999.bsor");
      expectStatus(response, 404);
    });

    test("returns 422 for invalid score id format", async () => {
      const response = await request(app, "/beatleader/replay/not-a-replay-id");
      expectStatus(response, 422);
    });

    test("returns 422 when replay id is missing .bsor suffix", async () => {
      const response = await request(app, `/beatleader/replay/${TEST_BEATLEADER_SCORE_ID}`);
      expectStatus(response, 422);
    });
  });
});
