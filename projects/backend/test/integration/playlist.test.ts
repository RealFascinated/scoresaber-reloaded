import { encodeCustomRankedPlaylistSettings } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { describe, expect, test } from "bun:test";
import { expectPlaylistBplistShape, expectPlaylistShape, expectStatus } from "../helpers/assertions";
import {
  TEST_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_SONG_HASH,
  TEST_SONG_HASH_TWO,
  UNKNOWN_PLAYER_ID,
} from "../helpers/constants";
import { createTestApp } from "../helpers/create-test-app";
import { request } from "../helpers/request";

const playlistIds = [
  "scoresaber-ranked-maps",
  "scoresaber-qualified-maps",
  "scoresaber-ranking-queue-maps",
  "scoresaber-trending",
] as const;

describe("Playlist API integration", () => {
  const app = createTestApp();

  describe("GET /playlist/:id", () => {
    for (const id of playlistIds) {
      test(`returns playlist for ${id}`, async () => {
        const response = await request(app, `/playlist/${id}`);
        expectStatus(response, 200);
        expectPlaylistShape(await response.json());
      });
    }

    for (const id of playlistIds) {
      for (const suffix of [".bplist", ".json"]) {
        test(`returns playlist for ${id}${suffix}`, async () => {
          const response = await request(app, `/playlist/${id}${suffix}`);
          expectStatus(response, 200);
          const body = await response.json();
          if (suffix === ".bplist") {
            expectPlaylistBplistShape(body);
          } else {
            expectPlaylistShape(body);
          }
        });
      }
    }

    test("ranked maps playlist includes seeded song", async () => {
      const response = await request(app, "/playlist/scoresaber-ranked-maps");
      expectStatus(response, 200);

      const body = (await response.json()) as { songs: Array<{ hash: string }> };
      expect(body.songs.some(song => song.hash.toLowerCase() === TEST_SONG_HASH.toLowerCase())).toBe(true);
    });

    test("qualified maps playlist includes seeded qualified song", async () => {
      const response = await request(app, "/playlist/scoresaber-qualified-maps");
      expectStatus(response, 200);

      const body = (await response.json()) as { songs: Array<{ hash: string }> };
      expect(body.songs.some(song => song.hash.toLowerCase() === TEST_SONG_HASH_TWO.toLowerCase())).toBe(
        true
      );
    });

    test("returns 422 for invalid playlist id", async () => {
      const response = await request(app, "/playlist/not-a-real-playlist");
      expectStatus(response, 422);
    });
  });

  describe("GET /playlist/scoresaber-custom-ranked-maps", () => {
    test("returns custom ranked playlist with config", async () => {
      const config = encodeCustomRankedPlaylistSettings({
        stars: { min: 0, max: 15 },
        sort: "stars",
      });
      const response = await request(app, `/playlist/scoresaber-custom-ranked-maps?config=${config}`);
      expectStatus(response, 200);
      expectPlaylistShape(await response.json());
    });

    test("returns 422 when config query param is missing", async () => {
      const response = await request(app, "/playlist/scoresaber-custom-ranked-maps");
      expectStatus(response, 422);
    });
  });

  describe("GET /playlist/snipe", () => {
    test("returns snipe playlist for tracked players", async () => {
      const response = await request(
        app,
        `/playlist/snipe?user=${TEST_PLAYER_ID}&toSnipe=${TEST_PLAYER_TWO_ID}`
      );
      expectStatus(response, 200);
      expectPlaylistShape(await response.json());
    });

    test("returns 422 when user query param is missing", async () => {
      const response = await request(app, `/playlist/snipe?toSnipe=${TEST_PLAYER_TWO_ID}`);
      expectStatus(response, 422);
    });

    test("returns 422 when toSnipe query param is missing", async () => {
      const response = await request(app, `/playlist/snipe?user=${TEST_PLAYER_ID}`);
      expectStatus(response, 422);
    });

    test("returns 400 when sniping yourself", async () => {
      const response = await request(app, `/playlist/snipe?user=${TEST_PLAYER_ID}&toSnipe=${TEST_PLAYER_ID}`);
      expectStatus(response, 400);
    });

    test("returns 404 when a player is not tracked", async () => {
      const response = await request(
        app,
        `/playlist/snipe?user=${TEST_PLAYER_ID}&toSnipe=${UNKNOWN_PLAYER_ID}`
      );
      expectStatus(response, 404);
    });
  });

  describe("GET /playlist/self", () => {
    test("returns self playlist for tracked player", async () => {
      const response = await request(app, `/playlist/self?user=${TEST_PLAYER_ID}`);
      expectStatus(response, 200);

      const body = (await response.json()) as { songs: unknown[] };
      expectPlaylistShape(body);
      expect(body.songs.length).toBeGreaterThan(0);
    });

    test("returns 422 when user query param is missing", async () => {
      const response = await request(app, "/playlist/self");
      expectStatus(response, 422);
    });

    test("returns 404 when player is not tracked", async () => {
      const response = await request(app, `/playlist/self?user=${UNKNOWN_PLAYER_ID}`);
      expectStatus(response, 404);
    });
  });

  describe("BPLIST highlighting", () => {
    test("self playlist emits the score's difficulty as a named entry for in-game highlighting", async () => {
      const response = await request(app, `/playlist/self.bplist?user=${TEST_PLAYER_ID}`);
      expectStatus(response, 200);

      const body = (await response.json()) as {
        songs: Array<{
          hash: string;
          difficulties: Array<{ name: string; characteristic: string }>;
        }>;
      };
      const song = body.songs.find(s => s.hash.toLowerCase() === TEST_SONG_HASH.toLowerCase());
      expect(song).toBeDefined();
      // TEST_SCORE_ID was set on leaderboard 900001 (ExpertPlus/Standard).
      expect(song?.difficulties).toEqual([{ name: "ExpertPlus", characteristic: "Standard" }]);
    });

    test("snipe playlist emits the sniped score's difficulty as a named entry", async () => {
      // player01 (950) outscored player02 (900) on the seeded leaderboard, so
      // sniping player01's scores from player02 includes the 900001 score.
      const response = await request(
        app,
        `/playlist/snipe.bplist?user=${TEST_PLAYER_TWO_ID}&toSnipe=${TEST_PLAYER_ID}`
      );
      expectStatus(response, 200);

      const body = (await response.json()) as {
        songs: Array<{
          hash: string;
          difficulties: Array<{ name: string; characteristic: string }>;
        }>;
      };
      const song = body.songs.find(s => s.hash.toLowerCase() === TEST_SONG_HASH.toLowerCase());
      expect(song).toBeDefined();
      expect(song?.difficulties).toEqual([{ name: "ExpertPlus", characteristic: "Standard" }]);
    });

    test("custom ranked playlist bplist uses named difficulties", async () => {
      const config = encodeCustomRankedPlaylistSettings({
        stars: { min: 0, max: 15 },
        sort: "stars",
      });
      const response = await request(app, `/playlist/scoresaber-custom-ranked-maps.bplist?config=${config}`);
      expectStatus(response, 200);

      const body = (await response.json()) as {
        songs: Array<{ difficulties: Array<{ name: string; characteristic: string }> }>;
      };
      const song = body.songs.find(s =>
        // Custom ranked playlists emit every difficulty of the seeded ranked leaderboard.
        s.difficulties.some(d => d.name === "ExpertPlus" && d.characteristic === "Standard")
      );
      expect(song).toBeDefined();
    });
  });
});
