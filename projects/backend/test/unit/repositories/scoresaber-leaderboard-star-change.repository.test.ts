import { describe, expect, test } from "bun:test";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../../src/repositories/scoresaber-leaderboard-star-change.repository";
import { TEST_LEADERBOARD_ID } from "../../helpers/constants";

describe("ScoreSaberLeaderboardStarChangeRepository", () => {
  test("listByLeaderboardIdOrderedByTimestampDesc returns seeded history", async () => {
    const rows = await ScoreSaberLeaderboardStarChangeRepository.listByLeaderboardIdOrderedByTimestampDesc(
      TEST_LEADERBOARD_ID
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.newStars).toBe(8.5);
  });

  test("insertRow appends another star change", async () => {
    await ScoreSaberLeaderboardStarChangeRepository.insertRow({
      leaderboardId: TEST_LEADERBOARD_ID,
      previousStars: 8.5,
      newStars: 9,
      timestamp: new Date("2024-07-01T00:00:00.000Z"),
    });
    const rows = await ScoreSaberLeaderboardStarChangeRepository.listByLeaderboardIdOrderedByTimestampDesc(
      TEST_LEADERBOARD_ID
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
