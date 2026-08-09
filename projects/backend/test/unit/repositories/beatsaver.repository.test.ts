import { describe, expect, test } from "bun:test";
import { BeatSaverRepository } from "../../../src/repositories/beatsaver.repository";
import { TEST_SONG_HASH } from "../../helpers/constants";

describe("BeatSaverRepository", () => {
  test("findMapBundleByVersionHash returns seeded map bundle", async () => {
    const bundle = await BeatSaverRepository.findMapBundleByVersionHash(TEST_SONG_HASH);
    expect(bundle?.map.id).toBe("testmap");
    expect(bundle?.difficulties.length).toBeGreaterThanOrEqual(1);
    expect(bundle?.version.hash).toBe(TEST_SONG_HASH);
  });

  test("findMapBundleByVersionHash returns undefined for unknown hash", async () => {
    expect(await BeatSaverRepository.findMapBundleByVersionHash("deadbeef")).toBeUndefined();
  });
});
