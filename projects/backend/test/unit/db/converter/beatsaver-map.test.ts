import { describe, expect, test } from "bun:test";
import { beatSaverRowsToMap } from "../../../../src/db/converter/beatsaver-map";
import type {
  BeatSaverMapDifficultyRow,
  BeatSaverMapRow,
  BeatSaverMapVersionRow,
  BeatSaverUploaderRow,
} from "../../../../src/db/schema";

const characteristic = "Standard" as const;
const difficulty = "Expert" as const;
const versionId = 10;
const mapId = "bsr-map-1";
const hash = "AbCdEf12";

function baseMapRow(overrides: Partial<BeatSaverMapRow> = {}): BeatSaverMapRow {
  return {
    id: mapId,
    name: "Test Map",
    description: "A test map",
    uploaderId: 1,
    bpm: 128,
    duration: 180,
    songName: "Song",
    songSubName: "Sub",
    songAuthorName: "Author",
    songAuthorUrl: "https://author.example",
    levelAuthorName: "Mapper",
    uploadedAt: new Date("2024-01-01T00:00:00.000Z"),
    automapper: false,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z"),
    lastPublishedAt: new Date("2024-01-02T00:00:00.000Z"),
    tags: ["test"],
    ...overrides,
  };
}

function baseUploader(overrides: Partial<BeatSaverUploaderRow> = {}): BeatSaverUploaderRow {
  return {
    id: 1,
    name: "Uploader",
    hash: "uploader-hash",
    avatar: "https://avatar.example/u.png",
    type: "USER",
    admin: true,
    curator: false,
    seniorCurator: false,
    verifiedMapper: true,
    playlistUrl: "https://playlist.example",
    ...overrides,
  };
}

function baseVersion(overrides: Partial<BeatSaverMapVersionRow> = {}): BeatSaverMapVersionRow {
  return {
    id: versionId,
    mapId,
    hash,
    stage: "published",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    downloadUrl: "https://download.example",
    coverUrl: "https://cover.example",
    previewUrl: "https://preview.example",
    ...overrides,
  };
}

function baseDifficulty(overrides: Partial<BeatSaverMapDifficultyRow> = {}): BeatSaverMapDifficultyRow {
  return {
    id: 100,
    versionId,
    characteristic,
    difficulty,
    njs: 16,
    offset: 0.5,
    notes: 500,
    bombs: 10,
    obstacles: 20,
    nps: 8.5,
    length: 120,
    events: 30,
    chroma: true,
    mappingExtensions: true,
    noodleExtensions: false,
    cinema: false,
    seconds: 118,
    maxScore: 400_000,
    label: "Expert",
    ...overrides,
  };
}

describe("beatSaverRowsToMap", () => {
  const cases = [
    {
      name: "returns undefined when no matching difficulty exists",
      args: {
        hash,
        characteristic,
        difficulty,
        map: baseMapRow(),
        uploader: baseUploader(),
        version: baseVersion(),
        difficulties: [baseDifficulty({ versionId: 999, characteristic, difficulty })],
      },
      expected: undefined,
    },
    {
      name: "returns undefined when characteristic does not match",
      args: {
        hash,
        characteristic,
        difficulty,
        map: baseMapRow(),
        uploader: baseUploader(),
        version: baseVersion(),
        difficulties: [baseDifficulty({ characteristic: "OneSaber" })],
      },
      expected: undefined,
    },
    {
      name: "maps all fields with full uploader",
      args: {
        hash,
        characteristic,
        difficulty,
        map: baseMapRow(),
        uploader: baseUploader(),
        version: baseVersion(),
        difficulties: [baseDifficulty()],
      },
      expected: {
        id: mapId,
        bsr: mapId,
        name: "Test Map",
        description: "A test map",
        songArt: `https://eu.cdn.beatsaver.com/${hash.toLowerCase()}.jpg`,
        author: {
          id: 1,
          name: "Uploader",
          hash: "uploader-hash",
          avatar: "https://avatar.example/u.png",
          type: "USER",
          admin: true,
          curator: false,
          seniorCurator: false,
          verifiedMapper: true,
          playlistUrl: "https://playlist.example",
        },
        metadata: {
          bpm: 128,
          duration: 180,
          songName: "Song",
          songSubName: "Sub",
          songAuthorName: "Author",
          songAuthorUrl: "https://author.example",
          levelAuthorName: "Mapper",
        },
        difficulty: {
          njs: 16,
          offset: 0.5,
          notes: 500,
          bombs: 10,
          obstacles: 20,
          nps: 8.5,
          length: 120,
          characteristic,
          difficulty,
          events: 30,
          chroma: true,
          mappingExtensions: true,
          noodleExtensions: false,
          cinema: false,
          seconds: 118,
          maxScore: 400_000,
          label: "Expert",
        },
      },
    },
    {
      name: "uses uploader defaults when uploader is null",
      args: {
        hash,
        characteristic,
        difficulty,
        map: baseMapRow({
          bpm: null,
          duration: null,
          songName: null,
          songSubName: null,
          songAuthorName: null,
          songAuthorUrl: null,
          levelAuthorName: null,
        }),
        uploader: null,
        version: baseVersion(),
        difficulties: [
          baseDifficulty({
            njs: null,
            offset: null,
            notes: null,
            bombs: null,
            obstacles: null,
            nps: null,
            length: null,
            events: null,
            chroma: null,
            mappingExtensions: null,
            noodleExtensions: null,
            cinema: null,
            seconds: null,
            maxScore: null,
            label: null,
          }),
        ],
      },
      expected: {
        id: mapId,
        bsr: mapId,
        name: "Test Map",
        description: "A test map",
        songArt: `https://eu.cdn.beatsaver.com/${hash.toLowerCase()}.jpg`,
        author: {
          id: 0,
          name: "Unknown",
          hash: "",
          avatar: "",
          type: "SIMPLE",
          admin: false,
          curator: false,
          seniorCurator: false,
          verifiedMapper: false,
          playlistUrl: "",
        },
        metadata: {
          bpm: 0,
          duration: 0,
          songName: "",
          songSubName: "",
          songAuthorName: "",
          songAuthorUrl: "",
          levelAuthorName: "",
        },
        difficulty: {
          njs: 0,
          offset: 0,
          notes: 0,
          bombs: 0,
          obstacles: 0,
          nps: 0,
          length: 0,
          characteristic,
          difficulty,
          events: 0,
          chroma: false,
          mappingExtensions: false,
          noodleExtensions: false,
          cinema: false,
          seconds: 0,
          maxScore: 0,
          label: "",
        },
      },
    },
    {
      name: "returns undefined for empty difficulties list",
      args: {
        hash: "",
        characteristic,
        difficulty,
        map: baseMapRow(),
        uploader: null,
        version: baseVersion(),
        difficulties: [],
      },
      expected: undefined,
    },
  ] as const;

  for (const { name, args, expected } of cases) {
    test(name, () => {
      expect(beatSaverRowsToMap(args)).toEqual(expected);
    });
  }
});
