import { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import type { PlaylistLeaderboardEntry } from "../../repositories/scoresaber-leaderboards.repository";

/**
 * Keeps every row for the top `limit` unique songs, grouped by song hash.
 * Rows must already be sorted so each song's first row determines its
 * position; all difficulties a player scored on stay in the result so the
 * playlist can highlight them all in-game.
 */
export function takeTopUniqueSongRows<Row extends Pick<PlaylistLeaderboardEntry, "songHash">>(
  rows: Row[],
  limit?: number
) {
  const groupedByHash = new Map<string, Row[]>();
  for (const row of rows) {
    const songRows = groupedByHash.get(row.songHash);
    if (songRows) {
      songRows.push(row);
    } else {
      groupedByHash.set(row.songHash, [row]);
    }
  }

  const result: Row[] = [];
  let songCount = 0;
  for (const songRows of groupedByHash.values()) {
    result.push(...songRows);
    songCount++;
    if (limit !== undefined && songCount >= limit) {
      break;
    }
  }

  return result;
}

/**
 * Builds playlist songs from leaderboard entries, emitting every difficulty per song
 * (highlighting them all in-game). Entries must be sorted; difficulties are grouped per
 * song hash in first-seen order.
 */
export function groupPlaylistSongs(entries: PlaylistLeaderboardEntry[]) {
  const songsByHash = new Map<string, Playlist["songs"][number]>();

  for (const entry of entries) {
    let song = songsByHash.get(entry.songHash);
    if (!song) {
      song = {
        songName: entry.songName,
        levelAuthorName: entry.songAuthorName,
        hash: entry.songHash,
        difficulties: [],
      };
      songsByHash.set(entry.songHash, song);
    }
    song.difficulties.push({ difficulty: entry.difficulty, characteristic: entry.characteristic });
  }

  return Array.from(songsByHash.values());
}
