import { describe, expect, test } from "bun:test";
import { BeatLeaderScoresRepository } from "../../../src/repositories/beatleader-scores.repository";
import {
  TEST_BEATLEADER_SCORE_ID,
  TEST_LEADERBOARD_ID,
  TEST_PLAYER_ID,
  TEST_SONG_HASH,
  UNKNOWN_SCORE_ID,
} from "../../helpers/constants";

describe("BeatLeaderScoresRepository", () => {
  test("findRowById returns seeded beatleader score", async () => {
    const row = await BeatLeaderScoresRepository.findRowById(TEST_BEATLEADER_SCORE_ID);
    expect(row?.playerId).toBe(TEST_PLAYER_ID);
    expect(row?.savedReplay).toBe(true);
  });

  test("rowExistsById and findExistingIds", async () => {
    expect(await BeatLeaderScoresRepository.rowExistsById(TEST_BEATLEADER_SCORE_ID)).toBe(true);
    const set = await BeatLeaderScoresRepository.findExistingIds([TEST_BEATLEADER_SCORE_ID, UNKNOWN_SCORE_ID]);
    expect(set.has(TEST_BEATLEADER_SCORE_ID)).toBe(true);
  });

  test("findLatestBySong returns seeded score", async () => {
    const row = await BeatLeaderScoresRepository.findLatestBySong(
      TEST_PLAYER_ID,
      TEST_SONG_HASH,
      "ExpertPlus",
      "Standard",
      950
    );
    expect(row?.id).toBe(TEST_BEATLEADER_SCORE_ID);
  });

  test("countSavedReplays counts replay-backed scores", async () => {
    expect(await BeatLeaderScoresRepository.countSavedReplays()).toBeGreaterThanOrEqual(1);
  });

  test("findPreviousIdBeforeTimestamp returns undefined when none earlier", async () => {
    const id = await BeatLeaderScoresRepository.findPreviousIdBeforeTimestamp(
      TEST_PLAYER_ID,
      TEST_SONG_HASH,
      String(TEST_LEADERBOARD_ID),
      new Date("2024-01-01T00:00:00.000Z")
    );
    expect(id).toBeUndefined();
  });
});
