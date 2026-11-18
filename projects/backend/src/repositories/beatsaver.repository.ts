import { BeatSaverMapToken } from "@ssr/common/schemas/beatsaver/tokens/map";
import { parseDate } from "@ssr/common/utils/time-utils";
import { eq, gte, and, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  beatSaverMapDifficultiesTable,
  beatSaverMapsTable,
  beatSaverMapVersionsTable,
  beatSaverMissingMapsTable,
  beatSaverUploadersTable,
} from "../db/schema";
import { differsFromExcluded } from "../db/upsert";

const DIFFICULTY_INSERT_CHUNK = 500;

const beatSaverVersionConflictSet = {
  mapId: sql`excluded."mapId"`,
  stage: sql`excluded."stage"`,
  createdAt: sql`excluded."createdAt"`,
  downloadUrl: sql`excluded."downloadUrl"`,
  coverUrl: sql`excluded."coverUrl"`,
  previewUrl: sql`excluded."previewUrl"`,
} as const;

const beatSaverVersionChangedWhere = differsFromExcluded([
  beatSaverMapVersionsTable.mapId,
  beatSaverMapVersionsTable.stage,
  beatSaverMapVersionsTable.createdAt,
  beatSaverMapVersionsTable.downloadUrl,
  beatSaverMapVersionsTable.coverUrl,
  beatSaverMapVersionsTable.previewUrl,
]);

const beatSaverDifficultyConflictSet = {
  njs: sql`excluded."njs"`,
  offset: sql`excluded."offset"`,
  notes: sql`excluded."notes"`,
  bombs: sql`excluded."bombs"`,
  obstacles: sql`excluded."obstacles"`,
  nps: sql`excluded."nps"`,
  length: sql`excluded."length"`,
  events: sql`excluded."events"`,
  chroma: sql`excluded."chroma"`,
  mappingExtensions: sql`excluded."mappingExtensions"`,
  noodleExtensions: sql`excluded."noodleExtensions"`,
  cinema: sql`excluded."cinema"`,
  seconds: sql`excluded."seconds"`,
  maxScore: sql`excluded."maxScore"`,
  label: sql`excluded."label"`,
} as const;

const beatSaverDifficultyChangedWhere = differsFromExcluded([
  beatSaverMapDifficultiesTable.njs,
  beatSaverMapDifficultiesTable.offset,
  beatSaverMapDifficultiesTable.notes,
  beatSaverMapDifficultiesTable.bombs,
  beatSaverMapDifficultiesTable.obstacles,
  beatSaverMapDifficultiesTable.nps,
  beatSaverMapDifficultiesTable.length,
  beatSaverMapDifficultiesTable.events,
  beatSaverMapDifficultiesTable.chroma,
  beatSaverMapDifficultiesTable.mappingExtensions,
  beatSaverMapDifficultiesTable.noodleExtensions,
  beatSaverMapDifficultiesTable.cinema,
  beatSaverMapDifficultiesTable.seconds,
  beatSaverMapDifficultiesTable.maxScore,
  beatSaverMapDifficultiesTable.label,
]);

const beatSaverUploaderChangedWhere = differsFromExcluded([
  beatSaverUploadersTable.name,
  beatSaverUploadersTable.hash,
  beatSaverUploadersTable.avatar,
  beatSaverUploadersTable.type,
  beatSaverUploadersTable.admin,
  beatSaverUploadersTable.curator,
  beatSaverUploadersTable.seniorCurator,
  beatSaverUploadersTable.verifiedMapper,
  beatSaverUploadersTable.playlistUrl,
]);

const beatSaverMapChangedWhere = differsFromExcluded([
  beatSaverMapsTable.name,
  beatSaverMapsTable.description,
  beatSaverMapsTable.uploaderId,
  beatSaverMapsTable.bpm,
  beatSaverMapsTable.duration,
  beatSaverMapsTable.songName,
  beatSaverMapsTable.songSubName,
  beatSaverMapsTable.songAuthorName,
  beatSaverMapsTable.songAuthorUrl,
  beatSaverMapsTable.levelAuthorName,
  beatSaverMapsTable.uploadedAt,
  beatSaverMapsTable.automapper,
  beatSaverMapsTable.createdAt,
  beatSaverMapsTable.updatedAt,
  beatSaverMapsTable.lastPublishedAt,
  beatSaverMapsTable.tags,
]);

// WARNING: empty name keeps the statement unnamed (pgbouncer)
const findMapBundleByVersionHashQuery = db
  .select({
    version: beatSaverMapVersionsTable,
    map: beatSaverMapsTable,
    uploader: beatSaverUploadersTable,
    difficulty: beatSaverMapDifficultiesTable,
  })
  .from(beatSaverMapVersionsTable)
  .innerJoin(beatSaverMapsTable, eq(beatSaverMapVersionsTable.mapId, beatSaverMapsTable.id))
  .leftJoin(beatSaverUploadersTable, eq(beatSaverMapsTable.uploaderId, beatSaverUploadersTable.id))
  .leftJoin(
    beatSaverMapDifficultiesTable,
    eq(beatSaverMapDifficultiesTable.versionId, beatSaverMapVersionsTable.id)
  )
  .where(eq(beatSaverMapVersionsTable.hash, sql.placeholder("hash")))
  .prepare("");

// WARNING: empty name keeps the statement unnamed (pgbouncer)
const isMarkedMissingQuery = db
  .select({ hash: beatSaverMissingMapsTable.hash })
  .from(beatSaverMissingMapsTable)
  .where(
    and(
      eq(beatSaverMissingMapsTable.hash, sql.placeholder("hash")),
      gte(beatSaverMissingMapsTable.checkedAt, sql.placeholder("since"))
    )
  )
  .limit(1)
  .prepare("");

type BeatSaverMapBundle = {
  map: typeof beatSaverMapsTable.$inferSelect;
  uploader: typeof beatSaverUploadersTable.$inferSelect | null;
  version: typeof beatSaverMapVersionsTable.$inferSelect;
  difficulties: (typeof beatSaverMapDifficultiesTable.$inferSelect)[];
};

export class BeatSaverRepository {
  public static async isMarkedMissing(hash: string, since: Date) {
    const rows = await isMarkedMissingQuery.execute({ hash: hash.toLowerCase(), since });
    return rows.length > 0;
  }

  public static async markMissing(hash: string) {
    const checkedAt = new Date();
    await db
      .insert(beatSaverMissingMapsTable)
      .values({ hash: hash.toLowerCase(), checkedAt })
      .onConflictDoUpdate({ target: beatSaverMissingMapsTable.hash, set: { checkedAt } });
  }

  public static async upsertMap(map: BeatSaverMapToken) {
    map.versions.forEach(version => {
      version.hash = version.hash.toLowerCase();
    });

    await db.transaction(async tx => {
      const uploader = map.uploader;
      if (uploader?.id != null) {
        await tx
          .insert(beatSaverUploadersTable)
          .values({
            id: uploader.id,
            name: uploader.name,
            hash: uploader.hash,
            avatar: uploader.avatar,
            type: uploader.type,
            admin: uploader.admin,
            curator: uploader.curator,
            seniorCurator: uploader.seniorCurator,
            verifiedMapper: uploader.verifiedMapper,
            playlistUrl: uploader.playlistUrl,
          })
          .onConflictDoUpdate({
            target: beatSaverUploadersTable.id,
            set: {
              name: uploader.name,
              hash: uploader.hash,
              avatar: uploader.avatar,
              type: uploader.type,
              admin: uploader.admin,
              curator: uploader.curator,
              seniorCurator: uploader.seniorCurator,
              verifiedMapper: uploader.verifiedMapper,
              playlistUrl: uploader.playlistUrl,
            },
            setWhere: beatSaverUploaderChangedWhere,
          });
      }

      await tx
        .insert(beatSaverMapsTable)
        .values({
          id: map.id,
          name: map.name,
          description: map.description,
          uploaderId: uploader?.id ?? null,
          bpm: map.metadata?.bpm ?? null,
          duration: map.metadata?.duration ?? null,
          songName: map.metadata?.songName ?? null,
          songSubName: map.metadata?.songSubName ?? null,
          songAuthorName: map.metadata?.songAuthorName ?? null,
          songAuthorUrl: map.metadata?.songAuthorUrl ?? null,
          levelAuthorName: map.metadata?.levelAuthorName ?? null,
          uploadedAt: map.uploaded ? parseDate(map.uploaded) : null,
          automapper: map.automapper,
          createdAt: parseDate(map.createdAt),
          updatedAt: parseDate(map.updatedAt),
          lastPublishedAt: map.lastPublishedAt ? parseDate(map.lastPublishedAt) : null,
          tags: map.tags,
        })
        .onConflictDoUpdate({
          target: beatSaverMapsTable.id,
          set: {
            name: map.name,
            description: map.description,
            uploaderId: uploader?.id ?? null,
            bpm: map.metadata?.bpm ?? null,
            duration: map.metadata?.duration ?? null,
            songName: map.metadata?.songName ?? null,
            songSubName: map.metadata?.songSubName ?? null,
            songAuthorName: map.metadata?.songAuthorName ?? null,
            songAuthorUrl: map.metadata?.songAuthorUrl ?? null,
            levelAuthorName: map.metadata?.levelAuthorName ?? null,
            uploadedAt: map.uploaded ? parseDate(map.uploaded) : null,
            automapper: map.automapper,
            createdAt: parseDate(map.createdAt),
            updatedAt: parseDate(map.updatedAt),
            lastPublishedAt: map.lastPublishedAt ? parseDate(map.lastPublishedAt) : null,
            tags: map.tags,
          },
          setWhere: beatSaverMapChangedWhere,
        });

      if (map.versions.length === 0) {
        return;
      }

      const versionRows = await tx
        .insert(beatSaverMapVersionsTable)
        .values(
          map.versions.map(version => ({
            mapId: map.id,
            hash: version.hash,
            stage: version.state ?? version.stage ?? null,
            createdAt: parseDate(version.createdAt),
            downloadUrl: version.downloadURL,
            coverUrl: version.coverURL,
            previewUrl: version.previewURL,
          }))
        )
        .onConflictDoUpdate({
          target: beatSaverMapVersionsTable.hash,
          set: beatSaverVersionConflictSet,
          setWhere: beatSaverVersionChangedWhere,
        })
        .returning({
          id: beatSaverMapVersionsTable.id,
          hash: beatSaverMapVersionsTable.hash,
        });

      const versionIdByHash = new Map(
        versionRows.map(versionRow => [versionRow.hash.toLowerCase(), versionRow.id])
      );

      const unchangedHashes = map.versions
        .map(version => version.hash)
        .filter(hash => !versionIdByHash.has(hash.toLowerCase()));
      if (unchangedHashes.length > 0) {
        const unchangedRows = await tx
          .select({ id: beatSaverMapVersionsTable.id, hash: beatSaverMapVersionsTable.hash })
          .from(beatSaverMapVersionsTable)
          .where(inArray(beatSaverMapVersionsTable.hash, unchangedHashes));
        for (const row of unchangedRows) {
          versionIdByHash.set(row.hash.toLowerCase(), row.id);
        }
      }

      const difficultyValues: (typeof beatSaverMapDifficultiesTable.$inferInsert)[] = [];
      for (const version of map.versions) {
        const versionId = versionIdByHash.get(version.hash.toLowerCase());
        if (!versionId) {
          continue;
        }
        for (const diff of version.diffs) {
          difficultyValues.push({
            versionId,
            characteristic: diff.characteristic,
            difficulty: diff.difficulty,
            njs: diff.njs,
            offset: diff.offset,
            notes: diff.notes,
            bombs: diff.bombs,
            obstacles: diff.obstacles,
            nps: diff.nps,
            length: diff.length,
            events: diff.events,
            chroma: diff.chroma,
            mappingExtensions: diff.me,
            noodleExtensions: diff.ne,
            cinema: diff.cinema,
            seconds: diff.seconds,
            maxScore: diff.maxScore,
            label: diff.label,
          });
        }
      }

      for (let i = 0; i < difficultyValues.length; i += DIFFICULTY_INSERT_CHUNK) {
        const chunk = difficultyValues.slice(i, i + DIFFICULTY_INSERT_CHUNK);
        await tx
          .insert(beatSaverMapDifficultiesTable)
          .values(chunk)
          .onConflictDoUpdate({
            target: [
              beatSaverMapDifficultiesTable.versionId,
              beatSaverMapDifficultiesTable.characteristic,
              beatSaverMapDifficultiesTable.difficulty,
            ],
            set: beatSaverDifficultyConflictSet,
            setWhere: beatSaverDifficultyChangedWhere,
          });
      }
    });
  }

  public static async findMapBundleByVersionHash(hash: string) {
    const normalizedHash = hash.toLowerCase();

    const rows = await findMapBundleByVersionHashQuery.execute({ hash: normalizedHash });

    if (rows.length === 0) {
      return undefined;
    }

    const { version, map, uploader } = rows[0];
    const uploaderRow = map.uploaderId == null ? null : uploader?.id != null ? uploader : null;
    const difficulties = rows.map(r => r.difficulty).filter(d => d != null);

    return { map, uploader: uploaderRow, version, difficulties };
  }

  /**
   * Batch variant of {@link findMapBundleByVersionHash}: one query for many hashes.
   *
   * @param hashes the version hashes to look up, matched case-insensitively
   * @returns the bundle of each hash, in the same order, `undefined` when not found
   */
  public static async findMapBundlesByVersionHashes(hashes: string[]) {
    if (hashes.length === 0) {
      return [];
    }

    const normalizedHashes = [...new Set(hashes.map(hash => hash.toLowerCase()))];
    const rows = await db
      .select({
        version: beatSaverMapVersionsTable,
        map: beatSaverMapsTable,
        uploader: beatSaverUploadersTable,
        difficulty: beatSaverMapDifficultiesTable,
      })
      .from(beatSaverMapVersionsTable)
      .innerJoin(beatSaverMapsTable, eq(beatSaverMapVersionsTable.mapId, beatSaverMapsTable.id))
      .leftJoin(beatSaverUploadersTable, eq(beatSaverMapsTable.uploaderId, beatSaverUploadersTable.id))
      .leftJoin(
        beatSaverMapDifficultiesTable,
        eq(beatSaverMapDifficultiesTable.versionId, beatSaverMapVersionsTable.id)
      )
      .where(inArray(beatSaverMapVersionsTable.hash, normalizedHashes));

    const bundles = new Map<string, BeatSaverMapBundle>();
    for (const row of rows) {
      const versionHash = row.version.hash.toLowerCase();
      let bundle = bundles.get(versionHash);
      if (!bundle) {
        const uploaderRow =
          row.map.uploaderId == null ? null : row.uploader?.id != null ? row.uploader : null;
        bundle = { map: row.map, uploader: uploaderRow, version: row.version, difficulties: [] };
        bundles.set(versionHash, bundle);
      }
      if (row.difficulty != null) {
        bundle.difficulties.push(row.difficulty);
      }
    }

    return hashes.map(hash => bundles.get(hash.toLowerCase()));
  }
}
