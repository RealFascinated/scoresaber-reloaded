import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
  TEST_BEATLEADER_SCORE_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_SONG_HASH,
} from "../../../test/helpers/constants";
import { db } from "../../db";
import { beatLeaderScoresTable } from "../../db/schema";
import BeatLeaderService from "./beatleader.service";

describe("BeatLeaderService", () => {
  test("concurrent getBeatLeaderScoreFromSong calls match sequential lookups", async () => {
    const [seeded] = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.id, TEST_BEATLEADER_SCORE_ID));
    await db.insert(beatLeaderScoresTable).values({
      ...seeded,
      id: TEST_BEATLEADER_SCORE_ID + 1,
      songHash: TEST_SONG_HASH.toUpperCase(),
    });
    const lookups = [
      { playerId: TEST_PLAYER_ID, score: 950 },
      { playerId: TEST_PLAYER_TWO_ID, score: 900 },
      { playerId: "unknown-player", score: 1 },
    ];
    const lookup = ({ playerId, score }: { playerId: string; score: number }) =>
      BeatLeaderService.getBeatLeaderScoreFromSong(playerId, TEST_SONG_HASH, "ExpertPlus", "Standard", score);

    const concurrent = await Promise.all(lookups.map(lookup));

    for (const [index, entry] of lookups.entries()) {
      expect(concurrent[index]).toEqual(await lookup(entry));
    }
    expect(concurrent[0]?.scoreId).toBe(TEST_BEATLEADER_SCORE_ID + 1);
    expect(concurrent[2]).toBeUndefined();
  });
});
