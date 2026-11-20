import { env } from "@ssr/common/env";
import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import type { SuggestedMap } from "@ssr/common/schemas/suggested-maps/suggested-maps";
import { formatDate } from "@ssr/common/utils/time-utils";

/** Songs in a suggested maps playlist when the request sets no limit. */
export const DEFAULT_PLAYLIST_SIZE = 50;

/**
 * Builds a playlist from ranked suggested maps, best first. A song with several suggested difficulties is one
 * entry with all of them, at the position of its best map.
 *
 * @param playerId the player the maps were suggested for
 * @param maps the suggested maps, best first
 * @param query the request's query, so the playlist can sync from the same filters
 * @param date when the playlist is made, for the title
 * @returns the playlist, synced from the suggested maps playlist endpoint
 */
export function buildSuggestedMapsPlaylist(
  playerId: string,
  maps: Pick<SuggestedMap, "songHash" | "songName" | "levelAuthorName" | "difficulty" | "characteristic">[],
  query: Record<string, string | number | boolean | undefined>,
  date: Date = new Date()
) {
  const songs = new Map<string, Playlist["songs"][number]>();
  for (const map of maps) {
    let song = songs.get(map.songHash);
    if (!song) {
      song = {
        songName: map.songName,
        levelAuthorName: map.levelAuthorName,
        hash: map.songHash,
        difficulties: [],
      };
      songs.set(map.songHash, song);
    }
    song.difficulties.push({ difficulty: map.difficulty, characteristic: map.characteristic });
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  return {
    playlistTitle: `${query.daily ? "Daily suggested maps" : "Suggested maps"} (${formatDate(date, "MMM D, YYYY")})`,
    playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
    customData: {
      syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/suggested-maps/${playerId}.bplist${params.size > 0 ? `?${params.toString()}` : ""}`,
    },
    songs: Array.from(songs.values()),
  };
}
