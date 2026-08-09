import { describe, expect, test } from "bun:test";
import { ScoreSaberLeaderboardsRepository } from "../../src/repositories/scoresaber-leaderboards.repository";
import { PlayerMedalsService } from "../../src/service/medals/player-medals.service";
import {
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_PLAYER_ID,
} from "../helpers/constants";

describe("PlayerMedalsService", () => {
  describe("refreshLeaderboardMedals", () => {
    test("no-ops for an unranked qualified leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(TEST_LEADERBOARD_QUALIFIED_ID);
      expect(leaderboard).toBeDefined();

      const changes = await PlayerMedalsService.refreshLeaderboardMedals(leaderboard!);
      expect(changes.size).toBe(0);
    });

    test("recomputes medals for a ranked leaderboard without throwing", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(TEST_LEADERBOARD_ID);
      expect(leaderboard).toBeDefined();

      const changes = await PlayerMedalsService.refreshLeaderboardMedals(leaderboard!);
      expect(changes).toBeInstanceOf(Map);
    });
  });

  describe("getPlayerMedalRanking", () => {
    test("returns a paginated medal ranking page", async () => {
      const page = await PlayerMedalsService.getPlayerMedalRanking(1);

      expect(page.metadata.page).toBe(1);
      expect(page.metadata.totalItems).toBeGreaterThanOrEqual(1);
      expect(page.items.length).toBeGreaterThanOrEqual(1);
      expect(page.items.some(player => player.id === TEST_PLAYER_ID)).toBe(true);
    });

    test("returns an empty page for an unknown country filter", async () => {
      const page = await PlayerMedalsService.getPlayerMedalRanking(1, "ZZ");
      expect(page.items).toEqual([]);
      expect(page.metadata.totalItems).toBe(0);
    });
  });
});
