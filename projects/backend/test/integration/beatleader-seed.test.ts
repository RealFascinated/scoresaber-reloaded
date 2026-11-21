import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import type { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { type RequestResult, requestFailure } from "@ssr/common/utils/request-result";
import { afterEach, describe, expect, test } from "bun:test";
import { ScoreSaberAccountsRepository } from "../../src/repositories/scoresaber-accounts.repository";
import BeatLeaderService from "../../src/service/beatleader/beatleader.service";
import { BeatLeaderApiService } from "../../src/service/external/beatleader-api.service";
import { PlayerBeatLeaderScoresService } from "../../src/service/player/player-beatleader-scores.service";
import { PlayerCoreService } from "../../src/service/player/player-core.service";
import { TEST_BEATLEADER_SCORE_ID, TEST_PLAYER_ID } from "../helpers/constants";

const originalLookupPage = BeatLeaderApiService.lookupPlayerScoresPage;
const originalUpsertMapping = BeatLeaderService.upsertBeatLeaderPlayer;

afterEach(() => {
  BeatLeaderApiService.lookupPlayerScoresPage = originalLookupPage;
  BeatLeaderService.upsertBeatLeaderPlayer = originalUpsertMapping;
});

function stubScoresPages(handler: (page: number) => Promise<RequestResult<BeatLeaderPlayerScoresPageToken>>) {
  const requestedPages: number[] = [];
  BeatLeaderApiService.lookupPlayerScoresPage = async (_playerId, page) => {
    requestedPages.push(page);
    return handler(page);
  };
  return requestedPages;
}

function trackedScorePage(page: number, total: number) {
  return {
    metadata: { itemsPerPage: 100, page, total },
    data: [{ id: TEST_BEATLEADER_SCORE_ID } as BeatLeaderScoreToken],
  } satisfies BeatLeaderPlayerScoresPageToken;
}

async function unseededAccount() {
  await ScoreSaberAccountsRepository.updateAccount(TEST_PLAYER_ID, {
    seededBeatLeaderScores: false,
    beatLeaderSeedPage: 0,
    beatLeaderSeedAttempts: 0,
    beatLeaderSeedLastAttempt: null,
  });

  const account = await PlayerCoreService.getAccount(TEST_PLAYER_ID);
  if (!account) {
    throw new Error(`Test player "${TEST_PLAYER_ID}" is missing`);
  }
  return account;
}

describe("PlayerBeatLeaderScoresService", () => {
  describe("fetchMissingBeatLeaderScores", () => {
    test("seeds a player who has no BeatLeader scores", async () => {
      const account = await unseededAccount();
      stubScoresPages(async () => requestFailure("not_found", 404, "BeatLeader returned 404 Not Found"));
      BeatLeaderService.upsertBeatLeaderPlayer = async () => undefined;

      const result = await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, {
        mode: "backfill",
      });

      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(result.totalPagesFetched).toBe(0);
      expect(row?.seededBeatLeaderScores).toBe(true);
      expect(row?.beatLeaderSeedAttempts).toBe(0);
    });

    test("keeps a player unseeded when a page cannot be fetched", async () => {
      const account = await unseededAccount();
      stubScoresPages(async () => requestFailure("server_error", 500, "BeatLeader returned HTTP 500"));

      await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, { mode: "backfill" });

      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(row?.seededBeatLeaderScores).toBe(false);
      expect(row?.beatLeaderSeedPage).toBe(0);
      expect(row?.beatLeaderSeedAttempts).toBe(1);
      expect(row?.beatLeaderSeedLastAttempt).not.toBeNull();
    });

    test("checkpoints the last page processed when a later page fails", async () => {
      const account = await unseededAccount();
      stubScoresPages(async page =>
        page === 1
          ? { ok: true, status: 200, response: trackedScorePage(1, 300) }
          : requestFailure("server_error", 500, "BeatLeader returned HTTP 500")
      );

      await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, { mode: "backfill" });

      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(row?.seededBeatLeaderScores).toBe(false);
      expect(row?.beatLeaderSeedPage).toBe(1);
      expect(row?.beatLeaderSeedAttempts).toBe(1);
    });

    test("resumes from the checkpoint instead of page 1", async () => {
      const account = await unseededAccount();
      await ScoreSaberAccountsRepository.updateAccount(TEST_PLAYER_ID, { beatLeaderSeedPage: 5 });
      const requestedPages = stubScoresPages(async () =>
        requestFailure("not_found", 404, "BeatLeader returned 404 Not Found")
      );

      await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, { mode: "backfill" });

      expect(requestedPages).toEqual([4]);
    });

    test("seeds a player whose BeatLeader mapping was cached", async () => {
      const account = await unseededAccount();
      stubScoresPages(async () => ({
        ok: true,
        status: 200,
        response: trackedScorePage(1, 1),
      }));
      BeatLeaderService.upsertBeatLeaderPlayer = async playerId => ({
        id: playerId,
        name: "TestPlayer",
        platform: "steam",
        steamId: playerId,
        oculusPCId: null,
        questId: null,
        lastFetched: new Date(),
      });

      await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, { mode: "backfill" });

      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(row?.seededBeatLeaderScores).toBe(true);
      expect(row?.beatLeaderSeedPage).toBe(0);
      expect(row?.beatLeaderSeedAttempts).toBe(0);
    });

    test("keeps a player with scores unseeded when no mapping can be cached", async () => {
      const account = await unseededAccount();
      stubScoresPages(async () => ({
        ok: true,
        status: 200,
        response: trackedScorePage(1, 1),
      }));
      BeatLeaderService.upsertBeatLeaderPlayer = async () => undefined;

      await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, { mode: "backfill" });

      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(row?.seededBeatLeaderScores).toBe(false);
      expect(row?.beatLeaderSeedAttempts).toBe(1);
    });
  });
});
