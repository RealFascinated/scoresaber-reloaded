import { describe, expect, test } from "bun:test";
import { alias, PgDialect } from "drizzle-orm/pg-core";
import { scoreSaberLeaderboardsTable } from "../../../src/db/schema";
import {
  aliasFtsMatch,
  aliasTsRankExpr,
  buildLeaderboardQuery,
  LEADERBOARD_SEARCH_PAGE_SIZE,
  leaderboardSearchCategoryOrderBy,
  ScoreSaberLeaderboardsRepository,
} from "../../../src/repositories/scoresaber-leaderboards.repository";
import { TableCountsRepository } from "../../../src/repositories/table-counts.repository";
import {
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_SONG_HASH,
  TEST_SONG_HASH_TWO,
  UNKNOWN_LEADERBOARD_ID,
} from "../../helpers/constants";

const INSERT_LEADERBOARD_ID = 900_010;

describe("ScoreSaberLeaderboardsRepository", () => {
  describe("getLeaderboards", () => {
    test("returns ranked leaderboards matching filters", async () => {
      const leaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboards({ ranked: true });
      expect(leaderboards.some(lb => lb.id === TEST_LEADERBOARD_ID)).toBe(true);
      expect(leaderboards.every(lb => lb.ranked)).toBe(true);
    });

    test("returns qualified leaderboards when qualified filter is set", async () => {
      const leaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboards({ qualified: true });
      expect(leaderboards.some(lb => lb.id === TEST_LEADERBOARD_QUALIFIED_ID)).toBe(true);
    });

    test("returns an empty array when nothing matches", async () => {
      const leaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboards({
        ranked: true,
        qualified: true,
      });
      expect(leaderboards).toEqual([]);
    });
  });

  describe("getLeaderboardByHash", () => {
    test("returns the seeded ranked leaderboard", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardByHash(
        TEST_SONG_HASH,
        "ExpertPlus",
        "Standard"
      );
      expect(leaderboard?.id).toBe(TEST_LEADERBOARD_ID);
      expect(leaderboard?.songName).toBe("Test Song");
    });

    test("matches seeded leaderboard regardless of hash casing", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardByHash(
        TEST_SONG_HASH.toUpperCase(),
        "ExpertPlus",
        "Standard"
      );
      expect(leaderboard?.id).toBe(TEST_LEADERBOARD_ID);
    });

    test("returns undefined for an unknown hash", async () => {
      expect(
        await ScoreSaberLeaderboardsRepository.getLeaderboardByHash(
          "ffffffffffffffffffffffffffffffff",
          "ExpertPlus",
          "Standard"
        )
      ).toBeUndefined();
    });
  });

  describe("existsById", () => {
    test("returns true for a seeded leaderboard", async () => {
      expect(await ScoreSaberLeaderboardsRepository.existsById(TEST_LEADERBOARD_ID)).toBe(true);
    });

    test("returns false for an unknown id", async () => {
      expect(await ScoreSaberLeaderboardsRepository.existsById(UNKNOWN_LEADERBOARD_ID)).toBe(false);
    });
  });

  describe("getLeaderboardById", () => {
    test("returns the seeded leaderboard with difficulties", async () => {
      const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(TEST_LEADERBOARD_ID);
      expect(leaderboard?.id).toBe(TEST_LEADERBOARD_ID);
      expect(leaderboard?.difficulty.difficulty).toBe("ExpertPlus");
    });

    test("returns undefined for an unknown id", async () => {
      expect(
        await ScoreSaberLeaderboardsRepository.getLeaderboardById(UNKNOWN_LEADERBOARD_ID)
      ).toBeUndefined();
    });
  });

  describe("searchLeaderboardIds", () => {
    test("returns an empty array for short queries", async () => {
      expect(await ScoreSaberLeaderboardsRepository.searchLeaderboardIds("Te")).toEqual([]);
    });

    test("finds leaderboards by full-text search", async () => {
      const ids = await ScoreSaberLeaderboardsRepository.searchLeaderboardIds("Test Song", 10);
      expect(ids).toContain(TEST_LEADERBOARD_ID);
    });

    test("returns an empty array when nothing matches", async () => {
      expect(await ScoreSaberLeaderboardsRepository.searchLeaderboardIds("zzznomatch", 10)).toEqual([]);
    });
  });

  describe("getLeaderboardsByIds", () => {
    test("returns all requested leaderboards", async () => {
      const leaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboardsByIds([
        TEST_LEADERBOARD_ID,
        TEST_LEADERBOARD_QUALIFIED_ID,
      ]);
      expect(leaderboards).toHaveLength(2);
    });

    test("returns an empty array when no ids match", async () => {
      expect(await ScoreSaberLeaderboardsRepository.getLeaderboardsByIds([UNKNOWN_LEADERBOARD_ID])).toEqual(
        []
      );
    });
  });

  describe("getRankedLeaderboards", () => {
    test("includes the seeded ranked map", async () => {
      const leaderboards = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards();
      expect(leaderboards.some(lb => lb.id === TEST_LEADERBOARD_ID)).toBe(true);
    });
  });

  describe("getQualifiedLeaderboards", () => {
    test("includes the seeded qualified map", async () => {
      const leaderboards = await ScoreSaberLeaderboardsRepository.getQualifiedLeaderboards();
      expect(leaderboards.some(lb => lb.id === TEST_LEADERBOARD_QUALIFIED_ID)).toBe(true);
    });
  });

  describe("getTopTrendingLeaderboards", () => {
    test("returns leaderboards ordered by trending score", async () => {
      const leaderboards = await ScoreSaberLeaderboardsRepository.getTopTrendingLeaderboards(5);
      expect(leaderboards[0]?.id).toBe(TEST_LEADERBOARD_QUALIFIED_ID);
      expect(leaderboards[1]?.id).toBe(TEST_LEADERBOARD_ID);
    });
  });

  describe("insert", () => {
    test("inserts a leaderboard without overwriting on conflict", async () => {
      const template = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_QUALIFIED_ID,
        false
      );
      const clone = {
        ...template!,
        id: INSERT_LEADERBOARD_ID,
        songName: "Inserted Leaderboard",
        songHash: TEST_SONG_HASH_TWO,
      };

      await ScoreSaberLeaderboardsRepository.insert(INSERT_LEADERBOARD_ID, clone);
      const inserted = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        INSERT_LEADERBOARD_ID,
        false
      );
      expect(inserted?.songName).toBe("Inserted Leaderboard");

      await ScoreSaberLeaderboardsRepository.insert(INSERT_LEADERBOARD_ID, {
        ...clone,
        songName: "Should Not Overwrite",
      });
      const unchanged = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        INSERT_LEADERBOARD_ID,
        false
      );
      expect(unchanged?.songName).toBe("Inserted Leaderboard");
    });
  });

  describe("updateLeaderboard", () => {
    test("updates partial fields on an existing leaderboard", async () => {
      const template = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_QUALIFIED_ID,
        false
      );
      const clone = {
        ...template!,
        id: INSERT_LEADERBOARD_ID,
        songName: "Updated Insert",
        songHash: TEST_SONG_HASH_TWO,
      };
      await ScoreSaberLeaderboardsRepository.insert(INSERT_LEADERBOARD_ID, clone);

      await ScoreSaberLeaderboardsRepository.updateLeaderboard(INSERT_LEADERBOARD_ID, { dailyPlays: 99 });
      const after = await ScoreSaberLeaderboardsRepository.getLeaderboardById(INSERT_LEADERBOARD_ID, false);
      expect(after?.dailyPlays).toBe(99);
    });
  });

  describe("upsertLeaderboards", () => {
    test("upserts leaderboard metadata in bulk", async () => {
      const template = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        TEST_LEADERBOARD_QUALIFIED_ID,
        false
      );
      const clone = {
        ...template!,
        id: INSERT_LEADERBOARD_ID,
        songName: "Upsert Insert",
        songHash: TEST_SONG_HASH_TWO,
      };
      await ScoreSaberLeaderboardsRepository.insert(INSERT_LEADERBOARD_ID, clone);
      const inserted = await ScoreSaberLeaderboardsRepository.getLeaderboardById(
        INSERT_LEADERBOARD_ID,
        false
      );

      await ScoreSaberLeaderboardsRepository.upsertLeaderboards([
        {
          ...inserted!,
          plays: inserted!.plays + 1,
        },
      ]);
      const updated = await ScoreSaberLeaderboardsRepository.getLeaderboardById(INSERT_LEADERBOARD_ID, false);
      expect(updated?.plays).toBe(inserted!.plays + 1);
    });

    test("no-ops on an empty batch", async () => {
      await ScoreSaberLeaderboardsRepository.upsertLeaderboards([]);
    });
  });

  describe("countTotal", () => {
    test("returns the leaderboard total from table counts", async () => {
      await TableCountsRepository.reconcile();
      expect(await ScoreSaberLeaderboardsRepository.countTotal()).toBeGreaterThanOrEqual(2);
    });
  });

  describe("buildLeaderboardQuery", () => {
    test("builds ranked filter clauses", () => {
      const query = buildLeaderboardQuery({ ranked: true });
      expect(query.whereClause).toBeDefined();
      expect(query.orderParts.length).toBeGreaterThan(0);
    });
  });

  describe("leaderboardSearchCategoryOrderBy", () => {
    test("returns sql order expressions for each category", () => {
      expect(leaderboardSearchCategoryOrderBy("plays", false).length).toBeGreaterThan(0);
      expect(leaderboardSearchCategoryOrderBy("daily_plays", true).length).toBeGreaterThan(0);
      expect(leaderboardSearchCategoryOrderBy("star_difficulty", false).length).toBeGreaterThan(0);
      expect(leaderboardSearchCategoryOrderBy("date_ranked", false).length).toBeGreaterThan(0);
    });
  });

  describe("aliasFtsMatch", () => {
    test("builds a full-text search expression", () => {
      const dialect = new PgDialect();
      const tableAlias = alias(scoreSaberLeaderboardsTable, "lb");
      expect(dialect.sqlToQuery(aliasFtsMatch(tableAlias, "test")).sql).toContain("to_tsvector");
      expect(dialect.sqlToQuery(aliasTsRankExpr(tableAlias, "test")).sql).toContain("ts_rank");
    });
  });

  describe("LEADERBOARD_SEARCH_PAGE_SIZE", () => {
    test("exports the search page size constant", () => {
      expect(LEADERBOARD_SEARCH_PAGE_SIZE).toBe(20);
    });
  });
});
