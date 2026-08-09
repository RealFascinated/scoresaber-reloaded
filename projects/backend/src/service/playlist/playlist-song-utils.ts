import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";

export type PlaylistScoreRow = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

/**
 * Keeps every row for the top `limit` unique songs, grouped by song hash.
 * Rows must already be sorted so each song's first row determines its
 * position; all difficulties a player scored on stay in the result so the
 * playlist can highlight them all in-game.
 */
export function takeTopUniqueSongRows(rows: PlaylistScoreRow[], limit?: number): PlaylistScoreRow[] {
  const groupedByHash = new Map<string, PlaylistScoreRow[]>();
  for (const row of rows) {
    const songRows = groupedByHash.get(row.leaderboard.songHash);
    if (songRows) {
      songRows.push(row);
    } else {
      groupedByHash.set(row.leaderboard.songHash, [row]);
    }
  }

  const result: PlaylistScoreRow[] = [];
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
 * Builds playlist songs from scored leaderboard rows, emitting every difficulty
 * a score was set on per song (highlighting them all in-game). Rows must be
 * sorted; difficulties are grouped per song hash in first-seen order.
 */
export function scoreRowsToPlaylistSongs(rows: PlaylistScoreRow[]): Playlist["songs"] {
  const songsByHash = new Map<string, Playlist["songs"][number]>();

  for (const { leaderboard } of rows) {
    let song = songsByHash.get(leaderboard.songHash);
    if (!song) {
      song = {
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: [],
      };
      songsByHash.set(leaderboard.songHash, song);
    }
    song.difficulties.push({
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
    });
  }

  return Array.from(songsByHash.values());
}
