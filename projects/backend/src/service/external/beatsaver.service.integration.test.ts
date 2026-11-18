import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { HttpResponse, http } from "msw";
import { BEATSAVER_API } from "../../../test/helpers/beatsaver-api.test-utils";
import { TEST_SONG_HASH, TEST_SONG_HASH_SHA1 } from "../../../test/helpers/constants";
import { server } from "../../../test/helpers/msw-server";
import { db } from "../../db";
import { beatSaverMissingMapsTable } from "../../db/schema";
import BeatSaverService from "./beatsaver.service";

const MISSING_HASH = "1234567890abcdef1234567890abcdef12345678";

describe("BeatSaverService.getMap", () => {
  afterAll(async () => {
    await db.delete(beatSaverMissingMapsTable).where(eq(beatSaverMissingMapsTable.hash, MISSING_HASH));
  });

  test("a BeatSaver 404 is remembered in the database and not requested again", async () => {
    let requests = 0;
    server.use(
      http.get(`${BEATSAVER_API}/maps/hash/:hash`, () => {
        requests++;
        return new HttpResponse(null, { status: 404 });
      })
    );

    const first = await BeatSaverService.getMap(MISSING_HASH.toUpperCase(), "Expert", "Standard");
    const second = await BeatSaverService.getMap(MISSING_HASH, "Hard", "Standard");

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(requests).toBe(1);

    const rows = await db
      .select()
      .from(beatSaverMissingMapsTable)
      .where(eq(beatSaverMissingMapsTable.hash, MISSING_HASH));
    expect(rows).toHaveLength(1);
  });

  test("concurrent getMap calls for different hashes match sequential calls", async () => {
    const hashes = [TEST_SONG_HASH, TEST_SONG_HASH_SHA1];

    const sequential: Awaited<ReturnType<typeof BeatSaverService.getMap>>[] = [];
    for (const hash of hashes) {
      sequential.push(await BeatSaverService.getMap(hash, "ExpertPlus", "Standard"));
    }

    const concurrent = await Promise.all(
      hashes.map(hash => BeatSaverService.getMap(hash, "ExpertPlus", "Standard"))
    );

    expect(concurrent).toEqual(sequential);
    expect(concurrent.map(map => map?.id)).toEqual(["testmap", "testmap-sha1"]);
    expect(concurrent.map(map => map?.name)).toEqual(["Test Song", "Test Song SHA1"]);
  });
});
