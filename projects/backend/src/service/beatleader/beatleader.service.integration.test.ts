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
import BeatLeaderService, { beatLeaderScoreLookupKey } from "./beatleader.service";

describe("BeatLeaderService", () => {
  test("getBeatLeaderScoresFromSong matches the single-score lookup for every score", async () => {
    const [seeded] = await db
      .select()
      .from(beatLeaderScoresTable)
      .where(eq(beatLeaderScoresTable.id, TEST_BEATLEADER_SCORE_ID));
    await db.insert(beatLeaderScoresTable).values({
      ...seeded,
      id: TEST_BEATLEADER_SCORE_ID + 1,
      songHash: TEST_SONG_HASH.toUpperCase(),
    });
    const scores = [
      { playerId: TEST_PLAYER_ID, score: 950 },
      { playerId: TEST_PLAYER_TWO_ID, score: 900 },
      { playerId: "unknown-player", score: 1 },
    ];

    const batch = await BeatLeaderService.getBeatLeaderScoresFromSong(
      scores,
      TEST_SONG_HASH,
      "ExpertPlus",
      "Standard"
    );

    for (const { playerId, score } of scores) {
      const single = await BeatLeaderService.getBeatLeaderScoreFromSong(
        playerId,
        TEST_SONG_HASH,
        "ExpertPlus",
        "Standard",
        score
      );
      expect(batch.get(beatLeaderScoreLookupKey(playerId, score))).toEqual(single);
    }
    expect(batch.get(beatLeaderScoreLookupKey(TEST_PLAYER_ID, 950))).toBeDefined();
    expect(batch.get(beatLeaderScoreLookupKey("unknown-player", 1))).toBeUndefined();
  });
});
