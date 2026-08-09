import { describe, expect, test } from "bun:test";
import { BeatLeaderPlayersRepository } from "../../../src/repositories/beatleader-players.repository";
import { TEST_PLAYER_ID, TEST_PLAYER_NAME } from "../../helpers/constants";

describe("BeatLeaderPlayersRepository", () => {
  test("findById returns seeded beatleader player", async () => {
    const row = await BeatLeaderPlayersRepository.findById(TEST_PLAYER_ID);
    expect(row?.name).toBe(TEST_PLAYER_NAME);
    expect(row?.platform).toBe("steam");
  });

  test("upsert updates existing player", async () => {
    const row = await BeatLeaderPlayersRepository.upsert({
      id: TEST_PLAYER_ID,
      name: "UpdatedName",
      platform: "oculus",
      lastFetched: new Date(),
    });
    expect(row.name).toBe("UpdatedName");
    expect(row.platform).toBe("oculus");
  });
});
