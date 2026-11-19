import { CreatePlaylistMapSchema } from "@ssr/common/schemas/chat/tools/map-tools";
import type { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import type { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import type { Static } from "typebox";
import { groupPlaylistSongs } from "../../playlist/playlist-song-utils";
import { playlistToBplist } from "../../playlist/playlist-to-bplist";

export const MAX_CREATE_PLAYLIST_SONGS = 100;
export const MAX_GENERATED_PLAYLIST_SONGS = 500;
export const MAX_PLAYLIST_TITLE_LENGTH = 100;
export const MAX_PLAYLIST_DESCRIPTION_LENGTH = 500;
export const MAX_COVER_IMAGE_LENGTH = 2000;
const MAX_PLAYLIST_SLUG_LENGTH = 80;

export type CreatePlaylistMapInput = Static<typeof CreatePlaylistMapSchema>;

export type BplistSong = {
  songName: string;
  levelAuthorName: string;
  hash: string;
  difficulties: {
    name: string;
    characteristic: string;
  }[];
};

export type BplistFile = {
  playlistTitle: string;
  playlistAuthor: string;
  playlistDescription?: string;
  image?: string;
  songs: BplistSong[];
};

export type SkippedMapEntry = {
  input: string;
  reason: string;
};

export type PlaylistToolSummary = {
  title: string;
  songCount: number;
  fileName: string;
  skipped?: SkippedMapEntry[];
};

export type PlaylistToolOutput = PlaylistToolSummary & {
  bplist: BplistFile;
};

export type PlaylistToolError = {
  error: string;
  skipped?: SkippedMapEntry[];
};

export type PlaylistToolResult = PlaylistToolOutput | PlaylistToolError;

export type ChatPlaylistSettings = {
  sort?: string;
  sortDirection?: string;
  rankedStatus?: string;
  requireBothScores?: boolean;
  starRange?: {
    min: number;
    max: number;
  };
  accuracyRange?: {
    min: number;
    max: number;
  };
  limit?: number;
};

export type ResolvedPlaylistMap = {
  songHash: string;
  songName: string;
  levelAuthorName: string;
  difficulty: MapDifficulty;
  characteristic: MapCharacteristic;
};

/**
 * Turns a title into a safe .bplist file name stem.
 */
export function slugifyPlaylistTitle(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_PLAYLIST_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : "playlist";
}

export function capPlaylistTitle(title: string) {
  return title.trim().slice(0, MAX_PLAYLIST_TITLE_LENGTH);
}

export function capPlaylistDescription(description: string | undefined) {
  if (!description) {
    return undefined;
  }
  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed.slice(0, MAX_PLAYLIST_DESCRIPTION_LENGTH) : undefined;
}

/**
 * Encodes the model's playlist settings the way the playlist service expects them.
 */
export function encodePlaylistSettings(settings: ChatPlaylistSettings | undefined) {
  if (!settings) {
    return undefined;
  }
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}

export function chunkItems<TItem>(items: TItem[], size: number) {
  if (size < 1) {
    throw new Error("Chunk size must be at least 1");
  }
  const chunks: TItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function describePlaylistMap(map: CreatePlaylistMapInput) {
  if ("leaderboardId" in map) {
    return `leaderboard ${map.leaderboardId}`;
  }
  return `${map.songHash} (${map.difficulty}${map.characteristic ? `, ${map.characteristic}` : ""})`;
}

function playlistMapKey(map: CreatePlaylistMapInput) {
  if ("leaderboardId" in map) {
    return `leaderboard:${map.leaderboardId}`;
  }
  return `hash:${map.songHash.toLowerCase()}:${map.difficulty}:${map.characteristic ?? "Standard"}`;
}

/**
 * Drops duplicate map entries, keeping first-seen order, and caps the list.
 */
export function uniquePlaylistMaps(maps: CreatePlaylistMapInput[], maxEntries: number) {
  const seen = new Set<string>();
  const unique: CreatePlaylistMapInput[] = [];
  for (const map of maps) {
    const key = playlistMapKey(map);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(map);
    if (unique.length >= maxEntries) {
      break;
    }
  }
  return unique;
}

/**
 * Drops maps that resolve to the same song difficulty, keeping first-seen order.
 */
export function dedupeResolvedMaps(maps: ResolvedPlaylistMap[]) {
  const seen = new Set<string>();
  const unique: ResolvedPlaylistMap[] = [];
  for (const map of maps) {
    const key = `${map.songHash.toLowerCase()}:${map.difficulty}:${map.characteristic}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(map);
  }
  return unique;
}

/**
 * Groups resolved maps into playlist songs, one entry per song with all of its difficulties.
 */
export function resolvedMapsToSongs(maps: ResolvedPlaylistMap[]) {
  return groupPlaylistSongs(
    maps.map(map => ({
      songHash: map.songHash,
      songName: map.songName,
      songAuthorName: map.levelAuthorName,
      difficulty: map.difficulty,
      characteristic: map.characteristic,
    }))
  );
}

function stripLargeCover(bplist: BplistFile) {
  if (bplist.image && bplist.image.length > MAX_COVER_IMAGE_LENGTH) {
    delete bplist.image;
  }
}

function toBplistFile(playlist: Playlist, description: string | undefined) {
  const bplist = JSON.parse(playlistToBplist(playlist)) as BplistFile;
  const cappedDescription = capPlaylistDescription(description);
  if (cappedDescription) {
    bplist.playlistDescription = cappedDescription;
  }
  stripLargeCover(bplist);
  return bplist;
}

/**
 * Builds the tool output: the summary the model sees plus the full playlist the UI downloads.
 */
export function buildPlaylistOutput(
  playlist: Playlist,
  options?: {
    description?: string;
    maxSongs?: number;
    skipped?: SkippedMapEntry[];
  }
) {
  const maxSongs = options?.maxSongs ?? MAX_GENERATED_PLAYLIST_SONGS;
  const bplist = toBplistFile(
    {
      ...playlist,
      songs: playlist.songs.slice(0, maxSongs),
      customData: undefined,
      image: undefined,
    },
    options?.description
  );

  return {
    title: playlist.playlistTitle,
    songCount: bplist.songs.length,
    fileName: `${slugifyPlaylistTitle(playlist.playlistTitle)}.bplist`,
    bplist,
    ...(options?.skipped && options.skipped.length > 0 ? { skipped: options.skipped } : {}),
  } satisfies PlaylistToolOutput;
}

/**
 * Trims a playlist tool result to the summary the model receives, never the playlist contents.
 */
export function playlistSummary(output: PlaylistToolOutput) {
  return {
    title: output.title,
    songCount: output.songCount,
    fileName: output.fileName,
    ...(output.skipped ? { skipped: output.skipped } : {}),
  } satisfies PlaylistToolSummary;
}

/**
 * Builds the model-facing tool output, keeping the bplist (and any cover) out of the model context.
 */
export function playlistModelOutput(output: PlaylistToolResult) {
  if ("error" in output) {
    return {
      type: "json" as const,
      value: {
        error: output.error,
        ...(output.skipped ? { skipped: output.skipped } : {}),
      },
    };
  }
  return {
    type: "json" as const,
    value: playlistSummary(output),
  };
}
