import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { HttpResponse, http } from "msw";
import { BEATSAVER_API } from "../../../test/helpers/beatsaver-api.test-utils";
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
});
