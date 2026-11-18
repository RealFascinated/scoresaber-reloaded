import { describe, expect, test } from "bun:test";
import type { PlaylistLeaderboardEntry } from "../../repositories/scoresaber-leaderboards.repository";
import { groupPlaylistSongs, takeTopUniqueSongRows } from "./playlist-song-utils";

function makeRow(songHash: string, difficulty: PlaylistLeaderboardEntry["difficulty"]) {
  return {
    songHash,
    songName: `Song ${songHash}`,
    songAuthorName: "Artist",
    difficulty,
    characteristic: "Standard" as const,
  } satisfies PlaylistLeaderboardEntry;
}

describe("takeTopUniqueSongRows", () => {
  test("keeps every row per song hash in sort order", () => {
    const rows = [makeRow("AAA", "ExpertPlus"), makeRow("AAA", "Expert"), makeRow("BBB", "Expert")];

    expect(takeTopUniqueSongRows(rows)).toHaveLength(3);
    expect(takeTopUniqueSongRows(rows)[0]?.difficulty).toBe("ExpertPlus");
    expect(takeTopUniqueSongRows(rows)[1]?.difficulty).toBe("Expert");
  });

  test("applies limit to unique songs instead of raw score rows", () => {
    const rows = [
      makeRow("AAA", "ExpertPlus"),
      makeRow("AAA", "Expert"),
      makeRow("BBB", "Expert"),
      makeRow("CCC", "Hard"),
    ];

    expect(takeTopUniqueSongRows(rows, 2)).toEqual([rows[0], rows[1], rows[2]]);
  });
});

describe("groupPlaylistSongs", () => {
  test("emits every difficulty per song for in-game highlighting", () => {
    const rows = [makeRow("AAA", "ExpertPlus"), makeRow("AAA", "Expert"), makeRow("BBB", "Expert")];

    const songs = groupPlaylistSongs(rows);

    expect(songs).toHaveLength(2);
    expect(songs[0]?.difficulties).toEqual([
      { difficulty: "ExpertPlus", characteristic: "Standard" },
      { difficulty: "Expert", characteristic: "Standard" },
    ]);
    expect(songs[1]?.difficulties).toEqual([{ difficulty: "Expert", characteristic: "Standard" }]);
  });
});
