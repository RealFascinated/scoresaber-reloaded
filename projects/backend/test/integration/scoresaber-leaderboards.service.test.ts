import { describe, expect, test } from "bun:test";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberLeaderboardsService } from "../../src/service/leaderboard/scoresaber-leaderboards.service";
import {
  TEST_LEADERBOARD_ID,
  TEST_SONG_HASH,
  UNKNOWN_LEADERBOARD_ID,
} from "../helpers/constants";

describe("ScoreSaberLeaderboardsService", () => {
  describe("getLeaderboard", () => {
    test("returns the seeded leaderboard by id", async () => {
      const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(TEST_LEADERBOARD_ID);
      expect(leaderboard.id).toBe(TEST_LEADERBOARD_ID);
      expect(leaderboard.songName).toBe("Test Song");
      expect(leaderboard.ranked).toBe(true);
    });

    test("throws NotFoundError for an unknown id", async () => {
      await expect(ScoreSaberLeaderboardsService.getLeaderboard(UNKNOWN_LEADERBOARD_ID)).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  describe("getLeaderboardByHash", () => {
    test("returns the seeded ranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboardByHash(
        TEST_SONG_HASH,
        "ExpertPlus",
        "Standard"
      );
      expect(leaderboard.id).toBe(TEST_LEADERBOARD_ID);
      expect(leaderboard.difficulty.difficulty).toBe("ExpertPlus");
    });

    test("matches seeded leaderboard regardless of hash casing", async () => {
      const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboardByHash(
        TEST_SONG_HASH.toUpperCase(),
        "ExpertPlus",
        "Standard"
      );
      expect(leaderboard.id).toBe(TEST_LEADERBOARD_ID);
    });

    test("throws NotFoundError for an unknown hash", async () => {
      await expect(
        ScoreSaberLeaderboardsService.getLeaderboardByHash(
          "ffffffffffffffffffffffffffffffff",
          "ExpertPlus",
          "Standard"
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getLeaderboardsPaginated", () => {
    test("returns ranked leaderboards on the first page", async () => {
      const page = await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(1, { ranked: true });
      expect(page.metadata.page).toBe(1);
      expect(page.metadata.totalItems).toBeGreaterThanOrEqual(1);
      expect(page.items.some(lb => lb.id === TEST_LEADERBOARD_ID)).toBe(true);
      expect(page.items.every(lb => lb.ranked)).toBe(true);
    });

    test("returns an empty leaderboard list when filters match nothing", async () => {
      const page = await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(1, {
        ranked: true,
        qualified: true,
      });
      expect(page.items).toEqual([]);
      expect(page.metadata.totalItems).toBe(0);
    });
  });
});
