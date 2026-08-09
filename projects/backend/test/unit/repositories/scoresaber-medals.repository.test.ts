import { describe, expect, test } from "bun:test";
import { ScoreSaberLeaderboardsRepository } from "../../../src/repositories/scoresaber-leaderboards.repository";
import { ScoreSaberMedalsRepository } from "../../../src/repositories/scoresaber-medals.repository";
import { ScoreSaberScoresRepository } from "../../../src/repositories/scoresaber-scores.repository";
import {
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_SCORE_ID,
  UNKNOWN_PLAYER_ID,
} from "../../helpers/constants";

describe("ScoreSaberMedalsRepository", () => {
  describe("updateMedalsOnRankedLeaderboard", () => {
    test("updates medals for a ranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_ID,
        false
      );
      await ScoreSaberMedalsRepository.updateMedalsOnRankedLeaderboard(leaderboard!);
      const topScore = await ScoreSaberScoresRepository.findRowByScoreId(TEST_SCORE_ID);
      expect(topScore?.medals).toBeGreaterThan(0);
    });

    test("no-ops for an unranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_QUALIFIED_ID,
        false
      );
      await ScoreSaberMedalsRepository.updateMedalsOnRankedLeaderboard({
        ...leaderboard!,
        ranked: false,
      });
    });
  });

  describe("updateMedalsOnLeaderboard", () => {
    test("returns affected player ids for a ranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_ID,
        false
      );
      const playerIds = await ScoreSaberMedalsRepository.updateMedalsOnLeaderboard(leaderboard!);
      expect(playerIds).toContain(TEST_PLAYER_ID);
    });

    test("returns an empty array for an unranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_QUALIFIED_ID,
        false
      );
      const playerIds = await ScoreSaberMedalsRepository.updateMedalsOnLeaderboard({
        ...leaderboard!,
        ranked: false,
      });
      expect(playerIds).toEqual([]);
    });
  });

  describe("selectPlayerIdsAffectedByMedalUpdate", () => {
    test("includes players on the ranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_ID,
        false
      );
      const playerIds = await ScoreSaberMedalsRepository.selectPlayerIdsAffectedByMedalUpdate(leaderboard!);
      expect(playerIds).toContain(TEST_PLAYER_ID);
      expect(playerIds).toContain(TEST_PLAYER_TWO_ID);
    });

    test("returns an empty array for an unranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_QUALIFIED_ID,
        false
      );
      const playerIds = await ScoreSaberMedalsRepository.selectPlayerIdsAffectedByMedalUpdate({
        ...leaderboard!,
        ranked: false,
      });
      expect(playerIds).toEqual([]);
    });
  });

  describe("getMedalTableScoreRanksForScores", () => {
    test("returns ranks for medal-bearing scores", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_ID,
        false
      );
      await ScoreSaberMedalsRepository.updateMedalsOnLeaderboard(leaderboard!);

      const ranks = await ScoreSaberMedalsRepository.getMedalTableScoreRanksForScores([
        { scoreId: TEST_SCORE_ID, leaderboardId: TEST_LEADERBOARD_ID },
      ]);
      expect(ranks.get(TEST_SCORE_ID)).toBe(1);
    });

    test("returns an empty map for an empty target list", async () => {
      expect((await ScoreSaberMedalsRepository.getMedalTableScoreRanksForScores([])).size).toBe(0);
    });
  });

  describe("selectIdAndMedalsByIds", () => {
    test("returns medal totals for known players", async () => {
      const rows = await ScoreSaberMedalsRepository.selectIdAndMedalsByIds([
        TEST_PLAYER_ID,
        TEST_PLAYER_TWO_ID,
      ]);
      expect(rows).toHaveLength(2);
      expect(rows.every(row => row.medals != null)).toBe(true);
    });

    test("returns an empty array when ids is empty", async () => {
      expect(await ScoreSaberMedalsRepository.selectIdAndMedalsByIds([])).toEqual([]);
    });
  });

  describe("syncGlobalMedalTotalsFromScoresTable", () => {
    test("recomputes account medal totals from score medals", async () => {
      await ScoreSaberMedalsRepository.syncGlobalMedalTotalsFromScoresTable();
      const rows = await ScoreSaberMedalsRepository.selectIdAndMedalsByIds([TEST_PLAYER_ID]);
      // TEST_PLAYER_ID has exactly one score (TEST_SCORE_ID) with medals=1.
      expect(rows[0]?.medals).toBe(1);
    });
  });

  describe("syncMedalTotalsForPlayerIds", () => {
    test("syncs totals for the requested players", async () => {
      await ScoreSaberMedalsRepository.syncMedalTotalsForPlayerIds([TEST_PLAYER_ID]);
      const rows = await ScoreSaberMedalsRepository.selectIdAndMedalsByIds([TEST_PLAYER_ID]);
      // TEST_PLAYER_ID has exactly one score (TEST_SCORE_ID) with medals=1.
      expect(rows[0]?.medals).toBe(1);
    });

    test("no-ops on an empty id list", async () => {
      await ScoreSaberMedalsRepository.syncMedalTotalsForPlayerIds([]);
    });
  });

  describe("refreshMaterializedMedalRanks", () => {
    test("assigns global and country ranks to medal players", async () => {
      await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
      const page = await ScoreSaberMedalsRepository.selectMedalRankingPage(undefined, 0, 10);
      expect(page.some(row => row.id === TEST_PLAYER_ID)).toBe(true);
      expect(page[0]!.medalsRank).toBeGreaterThan(0);
    });
  });

  describe("countMedalRankingPlayers", () => {
    test("returns a positive global count", async () => {
      expect(await ScoreSaberMedalsRepository.countMedalRankingPlayers()).toBeGreaterThanOrEqual(2);
    });

    test("returns a country-filtered count", async () => {
      expect(await ScoreSaberMedalsRepository.countMedalRankingPlayers("US")).toBeGreaterThanOrEqual(2);
    });

    test("returns zero for a country with no medal players", async () => {
      expect(await ScoreSaberMedalsRepository.countMedalRankingPlayers("ZZ")).toBe(0);
    });
  });

  describe("selectMedalRankingCountryMetadata", () => {
    test("returns grouped country counts", async () => {
      const metadata = await ScoreSaberMedalsRepository.selectMedalRankingCountryMetadata();
      expect(metadata.some(row => row.country === "US" && row.count >= 2)).toBe(true);
    });

    test("filters metadata to a single country when provided", async () => {
      const metadata = await ScoreSaberMedalsRepository.selectMedalRankingCountryMetadata("US");
      expect(metadata.every(row => row.country === "US")).toBe(true);
    });
  });

  describe("selectMedalRankingPage", () => {
    test("returns players ordered by medals descending", async () => {
      const page = await ScoreSaberMedalsRepository.selectMedalRankingPage(undefined, 0, 10);
      expect(page.some(row => row.id === TEST_PLAYER_ID)).toBe(true);
      for (let i = 1; i < page.length; i++) {
        expect(page[i - 1]!.medals).toBeGreaterThanOrEqual(page[i]!.medals);
      }
    });

    test("returns an empty page when offset exceeds available players", async () => {
      const total = await ScoreSaberMedalsRepository.countMedalRankingPlayers();
      const page = await ScoreSaberMedalsRepository.selectMedalRankingPage(undefined, total + 100, 10);
      expect(page).toEqual([]);
    });

    test("returns an empty page for an unknown country filter", async () => {
      expect(await ScoreSaberMedalsRepository.selectMedalRankingPage("ZZ", 0, 10)).toEqual([]);
    });

    test("excludes unknown players", async () => {
      const page = await ScoreSaberMedalsRepository.selectMedalRankingPage(undefined, 0, 50);
      expect(page.some(row => row.id === UNKNOWN_PLAYER_ID)).toBe(false);
    });
  });
});
