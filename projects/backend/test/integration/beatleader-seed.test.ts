import type { BeatLeaderPlayerScoresPageToken } from "@ssr/common/schemas/beatleader/tokens/score/page";
import type { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import type { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { afterEach, describe, expect, test } from "bun:test";
import { ScoreSaberAccountsRepository } from "../../src/repositories/scoresaber-accounts.repository";
import BeatLeaderService from "../../src/service/beatleader/beatleader.service";
import {
  BeatLeaderApiService,
  type BeatLeaderPlayerScoresPageResult,
} from "../../src/service/external/beatleader-api.service";
import { PlayerBeatLeaderScoresService } from "../../src/service/player/player-beatleader-scores.service";
import { PlayerCoreService } from "../../src/service/player/player-core.service";
import { TEST_BEATLEADER_SCORE_ID, TEST_PLAYER_ID } from "../helpers/constants";

const originalRequestPage = BeatLeaderApiService.requestPlayerScoresPage;
const originalUpsertMapping = BeatLeaderService.upsertBeatLeaderPlayer;

afterEach(() => {
  BeatLeaderApiService.requestPlayerScoresPage = originalRequestPage;
  BeatLeaderService.upsertBeatLeaderPlayer = originalUpsertMapping;
});

/**
 * Stubs answering a scores page request with whatever the test wants, recording the
 * pages the seed asked for.
 */
function stubScoresPages(
  handler: (page: number) => Promise<BeatLeaderPlayerScoresPageResult | undefined>
): number[] {
  const requestedPages: number[] = [];
  BeatLeaderApiService.requestPlayerScoresPage = async (_playerId, page) => {
    requestedPages.push(page);
    return handler(page);
  };
  return requestedPages;
}

/**
 * A page whose only score is already tracked, so seeding it writes nothing.
 */
function trackedScorePage(page: number, total: number): BeatLeaderPlayerScoresPageToken {
  return {
    metadata: { itemsPerPage: 100, page, total },
    data: [{ id: TEST_BEATLEADER_SCORE_ID } as BeatLeaderScoreToken],
  };
}

async function unseededAccount(): Promise<ScoreSaberAccount> {
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
      stubScoresPages(async () => ({ status: 404, page: undefined }));
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
      stubScoresPages(async () => ({ status: 500, page: undefined }));

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
        page === 1 ? { status: 200, page: trackedScorePage(1, 300) } : { status: 500, page: undefined }
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
      const requestedPages = stubScoresPages(async () => ({ status: 404, page: undefined }));

      await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, { mode: "backfill" });

      // The page before the checkpoint is fetched again, so scores that shifted down a
      // page are not skipped, and nothing earlier is re-fetched.
      expect(requestedPages).toEqual([4]);
    });

    test("seeds a player whose BeatLeader mapping was cached", async () => {
      const account = await unseededAccount();
      stubScoresPages(async () => ({ status: 200, page: trackedScorePage(1, 1) }));
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
      stubScoresPages(async () => ({ status: 200, page: trackedScorePage(1, 1) }));
      BeatLeaderService.upsertBeatLeaderPlayer = async () => undefined;

      await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, { mode: "backfill" });

      const row = await ScoreSaberAccountsRepository.findRowById(TEST_PLAYER_ID);
      expect(row?.seededBeatLeaderScores).toBe(false);
      expect(row?.beatLeaderSeedAttempts).toBe(1);
    });
  });
});
