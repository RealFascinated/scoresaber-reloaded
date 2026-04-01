import BeatSaverMapToken from "@ssr/common/types/token/beatsaver/map";
import { parseDate } from "@ssr/common/utils/time-utils";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  beatSaverMapDifficultiesTable,
  beatSaverMapsTable,
  beatSaverMapVersionsTable,
  beatSaverUploadersTable,
} from "../db/schema";

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

      for (const version of map.versions) {
        await tx
          .insert(beatSaverMapVersionsTable)
          .values({
            mapId: map.id,
            hash: version.hash,
            stage: version.state ?? version.stage ?? null,
            createdAt: parseDate(version.createdAt),
            downloadUrl: version.downloadURL,
            coverUrl: version.coverURL,
            previewUrl: version.previewURL,
          })
          .onConflictDoUpdate({
            target: beatSaverMapVersionsTable.hash,
            set: {
              mapId: map.id,
              stage: version.state ?? version.stage ?? null,
              createdAt: parseDate(version.createdAt),
              downloadUrl: version.downloadURL,
              coverUrl: version.coverURL,
              previewUrl: version.previewURL,
            },
          });
      }

      const versionRows = await tx
        .select()
        .from(beatSaverMapVersionsTable)
        .where(eq(beatSaverMapVersionsTable.mapId, map.id));
      const versionIdByHash = new Map(
        versionRows.map(versionRow => [versionRow.hash.toLowerCase(), versionRow.id])
      );

      for (const version of map.versions) {
        const versionId = versionIdByHash.get(version.hash.toLowerCase());
        if (!versionId) {
          continue;
        }
        for (const diff of version.diffs) {
          await tx
            .insert(beatSaverMapDifficultiesTable)
            .values({
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
            })
            .onConflictDoUpdate({
              target: [
                beatSaverMapDifficultiesTable.versionId,
                beatSaverMapDifficultiesTable.characteristic,
                beatSaverMapDifficultiesTable.difficulty,
              ],
              set: {
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
              },
            });
        }
      }
    });
  }

  public static async findMapBundleByVersionHash(hash: string) {
    const normalizedHash = hash.toLowerCase();
    const [matchedVersion] = await db
      .select()
      .from(beatSaverMapVersionsTable)
      .where(eq(beatSaverMapVersionsTable.hash, normalizedHash))
      .limit(1);
    if (!matchedVersion) {
      return undefined;
    }

    const [mapRow] = await db
      .select()
      .from(beatSaverMapsTable)
      .where(eq(beatSaverMapsTable.id, matchedVersion.mapId))
      .limit(1);
    if (!mapRow) {
      return undefined;
    }

    const uploaderRow =
      mapRow.uploaderId == null
        ? null
        : ((
            await db
              .select()
              .from(beatSaverUploadersTable)
              .where(eq(beatSaverUploadersTable.id, mapRow.uploaderId))
              .limit(1)
          )[0] ?? null);

    const difficulties = await db
      .select()
      .from(beatSaverMapDifficultiesTable)
      .where(eq(beatSaverMapDifficultiesTable.versionId, matchedVersion.id));

    return {
      map: mapRow,
      uploader: uploaderRow,
      version: matchedVersion,
      difficulties,
    };
  }
}
