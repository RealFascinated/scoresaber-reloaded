import type { BeatSaverMapToken } from "@ssr/common/schemas/beatsaver/tokens/map";
import { afterAll, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../src/db";
import {
  beatSaverMapDifficultiesTable,
  beatSaverMapsTable,
  beatSaverMapVersionsTable,
  beatSaverUploadersTable,
} from "../../../src/db/schema";
import { BeatSaverRepository } from "../../../src/repositories/beatsaver.repository";
import { TEST_SONG_HASH } from "../../helpers/constants";

const UPSERT_MAP_ID = "upsert-map";
const UPSERT_UPLOADER_ID = 987_654;
const UPSERT_HASH = "aabbccddeeff00112233445566778899aabbccdd";

function buildMapToken(overrides: Partial<BeatSaverMapToken> = {}): BeatSaverMapToken {
  return {
    id: UPSERT_MAP_ID,
    name: "Upsert Map",
    description: "A map used to test upserts",
    uploader: {
      id: UPSERT_UPLOADER_ID,
      name: "Mapper",
      hash: "mapperhash",
      avatar: "https://example.com/avatar.png",
      type: "SIMPLE",
      admin: false,
      curator: false,
      seniorCurator: false,
      verifiedMapper: true,
      playlistUrl: "https://example.com/playlist",
    },
    metadata: {
      bpm: 120,
      duration: 100,
      songName: "Song",
      songSubName: "",
      songAuthorName: "Artist",
      levelAuthorName: "Mapper",
    },
    stats: { plays: 0, downloads: 0, upvotes: 0, downvotes: 0, score: 0, reviews: 0 },
    automapper: false,
    ranked: false,
    qualified: false,
    versions: [
      {
        hash: UPSERT_HASH,
        state: "Published",
        createdAt: "2024-01-01T00:00:00.000Z",
        sageScore: 0,
        diffs: [
          {
            njs: 16,
            offset: 0,
            notes: 400,
            bombs: 0,
            obstacles: 0,
            nps: 4,
            length: 200,
            characteristic: "Standard",
            difficulty: "Expert",
            events: 0,
            chroma: false,
            me: false,
            ne: false,
            cinema: false,
            seconds: 100,
            paritySummary: { errors: 0, warns: 0, resets: 0 },
            maxScore: 100000,
            label: "",
          },
        ],
        downloadURL: "https://example.com/download.zip",
        coverURL: "https://example.com/cover.jpg",
        previewURL: "https://example.com/preview.mp3",
      },
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    tags: ["tech"],
    declaredAi: "None",
    blRanked: false,
    blQualified: false,
    ...overrides,
  };
}

/** The row version ids (`xmin`) of the upserted map, version and difficulty. A rewrite changes them. */
async function rowVersions(): Promise<{
  map: string;
  version: string;
  difficulty: string;
  uploader: string;
}> {
  const first = async (query: ReturnType<typeof sql>): Promise<string> => {
    const result = await db.execute<{ xmin: string }>(query);
    return result.rows[0]?.xmin ?? "";
  };
  return {
    map: await first(sql`SELECT xmin::text FROM "beatsaver-maps" WHERE id = ${UPSERT_MAP_ID}`),
    version: await first(sql`SELECT xmin::text FROM "beatsaver-map-versions" WHERE hash = ${UPSERT_HASH}`),
    difficulty: await first(
      sql`SELECT d.xmin::text FROM "beatsaver-map-difficulties" d JOIN "beatsaver-map-versions" v ON v.id = d."versionId" WHERE v.hash = ${UPSERT_HASH}`
    ),
    uploader: await first(sql`SELECT xmin::text FROM "beatsaver-uploaders" WHERE id = ${UPSERT_UPLOADER_ID}`),
  };
}

describe("BeatSaverRepository", () => {
  afterAll(async () => {
    await db
      .delete(beatSaverMapDifficultiesTable)
      .where(sql`"versionId" IN (SELECT id FROM "beatsaver-map-versions" WHERE "mapId" = ${UPSERT_MAP_ID})`);
    await db.delete(beatSaverMapVersionsTable).where(eq(beatSaverMapVersionsTable.mapId, UPSERT_MAP_ID));
    await db.delete(beatSaverMapsTable).where(eq(beatSaverMapsTable.id, UPSERT_MAP_ID));
    await db.delete(beatSaverUploadersTable).where(eq(beatSaverUploadersTable.id, UPSERT_UPLOADER_ID));
  });

  test("findMapBundleByVersionHash returns seeded map bundle", async () => {
    const bundle = await BeatSaverRepository.findMapBundleByVersionHash(TEST_SONG_HASH);
    expect(bundle?.map.id).toBe("testmap");
    expect(bundle?.difficulties.length).toBeGreaterThanOrEqual(1);
    expect(bundle?.version.hash).toBe(TEST_SONG_HASH);
  });

  test("findMapBundleByVersionHash returns undefined for unknown hash", async () => {
    expect(await BeatSaverRepository.findMapBundleByVersionHash("deadbeef")).toBeUndefined();
  });

  describe("upsertMap", () => {
    test("re-upserting an unchanged map rewrites no rows and keeps every version and difficulty", async () => {
      await BeatSaverRepository.upsertMap(buildMapToken());
      const before = await rowVersions();

      await BeatSaverRepository.upsertMap(buildMapToken());
      expect(await rowVersions()).toEqual(before);

      const bundle = await BeatSaverRepository.findMapBundleByVersionHash(UPSERT_HASH);
      expect(bundle?.map.id).toBe(UPSERT_MAP_ID);
      expect(bundle?.difficulties).toHaveLength(1);
    });

    test("a changed field still updates the row", async () => {
      await BeatSaverRepository.upsertMap(buildMapToken());
      const before = await rowVersions();

      const changed = buildMapToken({ name: "Renamed Map", tags: ["tech", "speed"] });
      changed.versions[0].diffs[0].notes = 450;
      await BeatSaverRepository.upsertMap(changed);

      const after = await rowVersions();
      expect(after.map).not.toBe(before.map);
      expect(after.difficulty).not.toBe(before.difficulty);
      expect(after.version).toBe(before.version);
      expect(after.uploader).toBe(before.uploader);

      const bundle = await BeatSaverRepository.findMapBundleByVersionHash(UPSERT_HASH);
      expect(bundle?.map.name).toBe("Renamed Map");
      expect(bundle?.map.tags).toEqual(["tech", "speed"]);
      expect(bundle?.difficulties[0]?.notes).toBe(450);
    });
  });
});
