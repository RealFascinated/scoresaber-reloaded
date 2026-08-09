import { describe, expect, test } from "bun:test";
import { ScoreSaberAccountsRepository } from "../../../src/repositories/scoresaber-accounts.repository";
import { TableCountsRepository } from "../../../src/repositories/table-counts.repository";
import {
  TEST_AVATAR,
  TEST_INACTIVE_PLAYER_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_NAME,
  TEST_PLAYER_TWO_ID,
  INSERT_ACCOUNT_ID,
  UNKNOWN_PLAYER_ID,
} from "../../helpers/constants";
import { buildAccountRow } from "../../helpers/fixtures";

describe("ScoreSaberAccountsRepository", () => {
  describe("findRowById", () => {
    test("returns the seeded account row", async () => {
      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(row?.id).toBe(TEST_PLAYER_ID);
      expect(row?.name).toBe(TEST_PLAYER_NAME);
      expect(row?.country).toBe("US");
    });

    test("returns undefined for an unknown id", async () => {
      expect(await ScoreSaberAccountsRepository.findRowById(UNKNOWN_PLAYER_ID)).toBeUndefined();
    });
  });

  describe("findManyByIds", () => {
    test("returns all requested rows", async () => {
      const rows = await ScoreSaberAccountsRepository.findManyByIds([TEST_PLAYER_ID, TEST_PLAYER_TWO_ID]);
      expect(rows).toHaveLength(2);
      expect(rows.map(row => row.id).sort()).toEqual([TEST_PLAYER_ID, TEST_PLAYER_TWO_ID].sort());
    });

    test("returns an empty array when ids is empty", async () => {
      expect(await ScoreSaberAccountsRepository.findManyByIds([])).toEqual([]);
    });

    test("omits unknown ids", async () => {
      const rows = await ScoreSaberAccountsRepository.findManyByIds([UNKNOWN_PLAYER_ID]);
      expect(rows).toEqual([]);
    });
  });

  describe("insert", () => {
    test("inserts a new account", async () => {
      const row = buildAccountRow({ id: INSERT_ACCOUNT_ID, name: "InsertedPlayer", seededScores: false });
      await ScoreSaberAccountsRepository.insert({
        id: row.id,
        name: row.name,
        country: row.country,
        avatar: row.avatar,
        seededScores: row.seededScores,
        seededBeatLeaderScores: false,
        trackReplays: row.trackReplays,
        inactive: row.inactive,
        banned: row.banned,
        pp: row.pp,
        medals: row.medals,
        trackedSince: row.trackedSince,
        joinedDate: row.joinedDate,
      });

      const inserted = await ScoreSaberAccountsRepository.findRowById(INSERT_ACCOUNT_ID);
      expect(inserted?.name).toBe("InsertedPlayer");
    });

    test("does nothing on duplicate primary key", async () => {
      const row = buildAccountRow({ id: INSERT_ACCOUNT_ID, name: "InsertedPlayer", seededScores: false });
      await ScoreSaberAccountsRepository.insert({
        id: row.id,
        name: row.name,
        country: row.country,
        avatar: row.avatar,
        seededScores: row.seededScores,
        seededBeatLeaderScores: false,
        trackReplays: row.trackReplays,
        inactive: row.inactive,
        banned: row.banned,
        pp: row.pp,
        medals: row.medals,
        trackedSince: row.trackedSince,
        joinedDate: row.joinedDate,
      });

      const before = await ScoreSaberAccountsRepository.findRowById(INSERT_ACCOUNT_ID);
      await ScoreSaberAccountsRepository.insert({
        id: INSERT_ACCOUNT_ID,
        name: "DuplicateName",
        country: "US",
        avatar: TEST_AVATAR,
        seededScores: false,
        seededBeatLeaderScores: false,
        trackReplays: false,
        inactive: false,
        banned: false,
        pp: 1,
        medals: 0,
        trackedSince: new Date(),
        joinedDate: new Date(),
      });
      const after = await ScoreSaberAccountsRepository.findRowById(INSERT_ACCOUNT_ID);
      expect(after?.name).toBe(before?.name);
    });
  });

  describe("existsById", () => {
    test("returns true for a seeded account", async () => {
      expect(await ScoreSaberAccountsRepository.existsById(TEST_PLAYER_ID)).toBe(true);
    });

    test("returns false for an unknown account", async () => {
      expect(await ScoreSaberAccountsRepository.existsById(UNKNOWN_PLAYER_ID)).toBe(false);
    });
  });

  describe("updateAccount", () => {
    test("returns false for an empty patch", async () => {
      expect(await ScoreSaberAccountsRepository.updateAccount(TEST_PLAYER_ID, {})).toBe(false);
    });

    test("updates values and returns true when changed", async () => {
      const before = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      const updated = await ScoreSaberAccountsRepository.updateAccount(TEST_PLAYER_ID, { pp: (before?.pp ?? 0) + 1 });
      expect(updated).toBe(true);
      const after = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(after?.pp).toBe((before?.pp ?? 0) + 1);
      await ScoreSaberAccountsRepository.updateAccount(TEST_PLAYER_ID, { pp: before?.pp ?? 0 });
    });

    test("returns false for a missing account", async () => {
      expect(await ScoreSaberAccountsRepository.updateAccount(UNKNOWN_PLAYER_ID, { pp: 1 })).toBe(false);
    });
  });

  describe("searchIdsByNameIlike", () => {
    test("finds players by case-insensitive substring", async () => {
      const ids = await ScoreSaberAccountsRepository.searchIdsByNameIlike("%testplayer%", 10);
      expect(ids.some(row => row.id === TEST_PLAYER_ID)).toBe(true);
    });

    test("returns an empty array when nothing matches", async () => {
      expect(await ScoreSaberAccountsRepository.searchIdsByNameIlike("%zzznomatch%", 10)).toEqual([]);
    });
  });

  describe("selectHmdCountsActiveAccounts", () => {
    test("groups active accounts by headset", async () => {
      const rows = await ScoreSaberAccountsRepository.selectHmdCountsActiveAccounts();
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every(row => typeof row.c === "number")).toBe(true);
    });
  });

  describe("selectIdsNeedingBeatLeaderSeed", () => {
    test("excludes fully seeded accounts", async () => {
      const ids = await ScoreSaberAccountsRepository.selectIdsNeedingBeatLeaderSeed();
      expect(ids.some(row => row.id === TEST_PLAYER_ID)).toBe(false);
    });

    test("respects the optional limit", async () => {
      const ids = await ScoreSaberAccountsRepository.selectIdsNeedingBeatLeaderSeed(1);
      expect(ids.length).toBeLessThanOrEqual(1);
    });
  });

  describe("selectIdsNeedingScoreSeed", () => {
    test("excludes fully seeded accounts", async () => {
      const ids = await ScoreSaberAccountsRepository.selectIdsNeedingScoreSeed();
      expect(ids.some(row => row.id === TEST_PLAYER_ID)).toBe(false);
    });

    test("respects the optional limit", async () => {
      const ids = await ScoreSaberAccountsRepository.selectIdsNeedingScoreSeed(1);
      expect(ids.length).toBeLessThanOrEqual(1);
    });
  });

  describe("markInactiveWhereIdNotIn", () => {
    test("marks active accounts outside the keep-list inactive", async () => {
      await ScoreSaberAccountsRepository.markInactiveWhereIdNotIn([TEST_PLAYER_ID]);
      const inactive = await ScoreSaberAccountsRepository.findRowById(TEST_INACTIVE_PLAYER_ID);
      const active = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(inactive?.inactive).toBe(true);
      expect(active?.inactive).toBe(false);
    });
  });

  describe("countInactive", () => {
    test("returns the inactive account total from table counts", async () => {
      await TableCountsRepository.reconcile();
      const inactive = await ScoreSaberAccountsRepository.countInactive();
      expect(inactive).toBeGreaterThanOrEqual(1);
    });
  });

  describe("countTotal", () => {
    test("returns the account total from table counts", async () => {
      await TableCountsRepository.reconcile();
      const total = await ScoreSaberAccountsRepository.countTotal();
      expect(total).toBeGreaterThanOrEqual(3);
    });
  });

  describe("countJoinedSince", () => {
    test("counts accounts joined on or after the given date", async () => {
      const count = await ScoreSaberAccountsRepository.countJoinedSince(new Date("2024-01-01T00:00:00.000Z"));
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test("returns zero for a future date", async () => {
      const count = await ScoreSaberAccountsRepository.countJoinedSince(new Date("2099-01-01T00:00:00.000Z"));
      expect(count).toBe(0);
    });
  });

  describe("selectAllIds", () => {
    test("includes every seeded account id", async () => {
      const ids = new Set((await ScoreSaberAccountsRepository.selectAllIds()).map(row => row.id));
      expect(ids.has(TEST_PLAYER_ID)).toBe(true);
      expect(ids.has(TEST_PLAYER_TWO_ID)).toBe(true);
      expect(ids.has(TEST_INACTIVE_PLAYER_ID)).toBe(true);
    });
  });
});
