import { describe, expect, test } from "bun:test";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberAccountsRepository } from "../../src/repositories/scoresaber-accounts.repository";
import { PlayerCoreService } from "../../src/service/player/player-core.service";
import { INSERT_ACCOUNT_ID, TEST_PLAYER_ID, UNKNOWN_PLAYER_ID } from "../helpers/constants";

describe("PlayerCoreService", () => {
  describe("playerExists", () => {
    test("returns true for seeded player", async () => {
      expect(await PlayerCoreService.playerExists(TEST_PLAYER_ID)).toBe(true);
    });

    test("returns false for unknown player", async () => {
      expect(await PlayerCoreService.playerExists(UNKNOWN_PLAYER_ID)).toBe(false);
    });

    test("throws when throwIfNotFound is true and player is missing", async () => {
      await expect(PlayerCoreService.playerExists(UNKNOWN_PLAYER_ID, true)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getAccount", () => {
    test("returns the seeded account", async () => {
      const account = await PlayerCoreService.getAccount(TEST_PLAYER_ID);
      expect(account?.id).toBe(TEST_PLAYER_ID);
      expect(account?.name).toBe("TestPlayer");
    });

    test("returns undefined for an unknown player", async () => {
      expect(await PlayerCoreService.getAccount(UNKNOWN_PLAYER_ID)).toBeUndefined();
    });
  });

  describe("updatePlayer", () => {
    test("no-ops on an empty patch", async () => {
      const before = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      await PlayerCoreService.updatePlayer(TEST_PLAYER_ID, {}, { invalidateCache: false });
      const after = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(after?.country).toBe(before?.country);
    });

    test("persists partial account updates", async () => {
      await PlayerCoreService.updatePlayer(TEST_PLAYER_ID, { country: "CA" }, { invalidateCache: false });
      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(row?.country).toBe("CA");

      await PlayerCoreService.updatePlayer(TEST_PLAYER_ID, { country: "US" }, { invalidateCache: false });
    });
  });

  describe("createIfMissing", () => {
    test("does not throw when the player already exists", async () => {
      await expect(PlayerCoreService.createIfMissing(TEST_PLAYER_ID)).resolves.toBeUndefined();
    });

    test("creates a missing player when the ScoreSaber API stub returns a token", async () => {
      await expect(PlayerCoreService.createIfMissing(INSERT_ACCOUNT_ID)).resolves.toBeUndefined();
      expect(await PlayerCoreService.playerExists(INSERT_ACCOUNT_ID)).toBe(true);
    });
  });
});
