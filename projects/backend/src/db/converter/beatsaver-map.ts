import { BeatSaverMap, BeatSaverMapSchema } from "@ssr/common/schemas/beatsaver/map/map";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import {
  BeatSaverMapDifficultyRow,
  BeatSaverMapRow,
  BeatSaverMapVersionRow,
  BeatSaverUploaderRow,
} from "../schema";

type BeatSaverRowsToMapArgs = {
  hash: string;
  characteristic: MapCharacteristic;
  difficulty: MapDifficulty;
  map: BeatSaverMapRow;
  uploader: BeatSaverUploaderRow | null;
  version: BeatSaverMapVersionRow;
  difficulties: BeatSaverMapDifficultyRow[];
};

export function beatSaverRowsToMap({
  hash,
  characteristic,
  difficulty,
  map,
  uploader,
  version,
  difficulties,
}: BeatSaverRowsToMapArgs): BeatSaverMap | undefined {
  const selectedDifficulty = difficulties.find(
    diff =>
      diff.versionId === version.id &&
      diff.characteristic === characteristic &&
      diff.difficulty === difficulty
  );
  if (!selectedDifficulty) {
    return undefined;
  }

  const before = performance.now();
  const beatSaverMap = BeatSaverMapSchema.parse(
    {
      id: map.id,
      bsr: map.id,
      name: map.name,
      description: map.description,
      songArt: `https://eu.cdn.beatsaver.com/${hash.toLowerCase()}.jpg`,
      author: {
        id: uploader?.id ?? 0,
        name: uploader?.name ?? "Unknown",
        hash: uploader?.hash ?? "",
        avatar: uploader?.avatar ?? "",
        type: uploader?.type ?? "SIMPLE",
        admin: uploader?.admin ?? false,
        curator: uploader?.curator ?? false,
        seniorCurator: uploader?.seniorCurator ?? false,
        verifiedMapper: uploader?.verifiedMapper ?? false,
        playlistUrl: uploader?.playlistUrl ?? "",
      },
      metadata: {
        bpm: map.bpm ?? 0,
        duration: map.duration ?? 0,
        songName: map.songName ?? "",
        songSubName: map.songSubName ?? "",
        songAuthorName: map.songAuthorName ?? "",
        songAuthorUrl: map.songAuthorUrl ?? "",
        levelAuthorName: map.levelAuthorName ?? "",
      },
      difficulty: {
        njs: selectedDifficulty.njs ?? 0,
        offset: selectedDifficulty.offset ?? 0,
        notes: selectedDifficulty.notes ?? 0,
        bombs: selectedDifficulty.bombs ?? 0,
        obstacles: selectedDifficulty.obstacles ?? 0,
        nps: selectedDifficulty.nps ?? 0,
        length: selectedDifficulty.length ?? 0,
        characteristic,
        difficulty,
        events: selectedDifficulty.events ?? 0,
        chroma: selectedDifficulty.chroma ?? false,
        mappingExtensions: selectedDifficulty.mappingExtensions ?? false,
        noodleExtensions: selectedDifficulty.noodleExtensions ?? false,
        cinema: selectedDifficulty.cinema ?? false,
        seconds: selectedDifficulty.seconds ?? 0,
        maxScore: selectedDifficulty.maxScore ?? 0,
        label: selectedDifficulty.label ?? "",
      },
    },
    { reportInput: true }
  );
  const after = performance.now();
  console.log(`beatSaverRowsToMap took ${after - before}ms`);
  return beatSaverMap;
}
