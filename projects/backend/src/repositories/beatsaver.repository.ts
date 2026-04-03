import BeatSaverMapToken from "@ssr/common/types/token/beatsaver/map";
import { parseDate } from "@ssr/common/utils/time-utils";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  beatSaverMapDifficultiesTable,
  beatSaverMapsTable,
  beatSaverMapVersionsTable,
  beatSaverUploadersTable,
} from "../db/schema";

const DIFFICULTY_INSERT_CHUNK = 500;

const beatSaverVersionConflictSet = {
  mapId: sql`excluded."mapId"`,
  stage: sql`excluded."stage"`,
  createdAt: sql`excluded."createdAt"`,
  downloadUrl: sql`excluded."downloadUrl"`,
  coverUrl: sql`excluded."coverUrl"`,
  previewUrl: sql`excluded."previewUrl"`,
} as const;

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

export class BeatSaverRepository {
  public static async upsertMap(map: BeatSaverMapToken): Promise<void> {
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
        })
        .returning({
          id: beatSaverMapVersionsTable.id,
          hash: beatSaverMapVersionsTable.hash,
        });

      const versionIdByHash = new Map(
        versionRows.map(versionRow => [versionRow.hash.toLowerCase(), versionRow.id])
      );

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
          });
      }
    });
  }

  public static async findMapBundleByVersionHash(hash: string) {
    const normalizedHash = hash.toLowerCase();
    const [row] = await db
      .select({
        version: beatSaverMapVersionsTable,
        map: beatSaverMapsTable,
        uploader: beatSaverUploadersTable,
      })
      .from(beatSaverMapVersionsTable)
      .innerJoin(beatSaverMapsTable, eq(beatSaverMapVersionsTable.mapId, beatSaverMapsTable.id))
      .leftJoin(beatSaverUploadersTable, eq(beatSaverMapsTable.uploaderId, beatSaverUploadersTable.id))
      .where(eq(beatSaverMapVersionsTable.hash, normalizedHash))
      .limit(1);

    if (!row) {
      return undefined;
    }

    const uploaderRow = row.map.uploaderId == null ? null : row.uploader?.id != null ? row.uploader : null;

    const difficulties = await db
      .select()
      .from(beatSaverMapDifficultiesTable)
      .where(eq(beatSaverMapDifficultiesTable.versionId, row.version.id));

    return {
      map: row.map,
      uploader: uploaderRow,
      version: row.version,
      difficulties,
    };
  }
}
