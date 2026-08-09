import { describe, expect, test } from "bun:test";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import {
  scoreRowsToPlaylistSongs,
  takeTopUniqueSongRows,
  type PlaylistScoreRow,
} from "../../src/service/playlist/playlist-song-utils";

function makeRow(
  songHash: string,
  difficulty: ScoreSaberLeaderboard["difficulty"]["difficulty"],
  pp: number
): PlaylistScoreRow {
  const leaderboard = {
    songHash,
    songName: `Song ${songHash}`,
    songAuthorName: "Artist",
    difficulty: {
      id: pp,
      stars: 5,
      difficulty,
      characteristic: "Standard" as const,
    },
  } as ScoreSaberLeaderboard;

  const score = {
    pp,
    difficulty,
    characteristic: "Standard" as const,
  } as ScoreSaberScore;

  return { score, leaderboard };
}

describe("takeTopUniqueSongRows", () => {
  test("keeps the first row per song hash in sort order", () => {
    const rows = [
      makeRow("AAA", "ExpertPlus", 300),
      makeRow("AAA", "Expert", 250),
      makeRow("BBB", "Expert", 200),
    ];

    expect(takeTopUniqueSongRows(rows)).toHaveLength(2);
    expect(takeTopUniqueSongRows(rows)[0]?.leaderboard.difficulty.difficulty).toBe("ExpertPlus");
  });

  test("applies limit to unique songs instead of raw score rows", () => {
    const rows = [
      makeRow("AAA", "ExpertPlus", 300),
      makeRow("AAA", "Expert", 250),
      makeRow("BBB", "Expert", 200),
      makeRow("CCC", "Hard", 100),
    ];

    expect(takeTopUniqueSongRows(rows, 2)).toEqual([rows[0], rows[2]]);
  });
});

describe("scoreRowsToPlaylistSongs", () => {
  test("emits exactly one difficulty per song for in-game highlighting", () => {
    const rows = [makeRow("AAA", "ExpertPlus", 300), makeRow("BBB", "Expert", 200)];

    const songs = scoreRowsToPlaylistSongs(rows);

    expect(songs).toHaveLength(2);
    expect(songs[0]?.difficulties).toEqual([
      { difficulty: "ExpertPlus", characteristic: "Standard" },
    ]);
    expect(songs[1]?.difficulties).toEqual([{ difficulty: "Expert", characteristic: "Standard" }]);
  });
});
