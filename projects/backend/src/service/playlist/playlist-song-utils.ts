import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";

export type PlaylistScoreRow = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

/**
 * Keeps the first row per song hash. Rows must already be sorted so the first
 * row for each song is the one that should appear in the playlist.
 */
export function takeTopUniqueSongRows(rows: PlaylistScoreRow[], limit?: number): PlaylistScoreRow[] {
  const result: PlaylistScoreRow[] = [];
  const seenSongHashes = new Set<string>();

  for (const row of rows) {
    const songHash = row.leaderboard.songHash;
    if (seenSongHashes.has(songHash)) {
      continue;
    }

    seenSongHashes.add(songHash);
    result.push(row);

    if (limit !== undefined && result.length >= limit) {
      break;
    }
  }

  return result;
}

/**
 * Builds playlist songs from scored leaderboard rows, selecting only the difficulty
 * each score was set on (highlighting it in-game). Rows must already be sorted and
 * deduplicated per song; only one difficulty is emitted per song.
 */
export function scoreRowsToPlaylistSongs(rows: PlaylistScoreRow[]): Playlist["songs"] {
  const songs: Playlist["songs"] = [];

  for (const { leaderboard } of rows) {
    songs.push({
      songName: leaderboard.songName,
      levelAuthorName: leaderboard.songAuthorName,
      hash: leaderboard.songHash,
      difficulties: [
        {
          difficulty: leaderboard.difficulty.difficulty,
          characteristic: leaderboard.difficulty.characteristic,
        },
      ],
    });
  }

  return songs;
}
