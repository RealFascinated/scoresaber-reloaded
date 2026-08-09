import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { describe, expect, test } from "bun:test";
import { playlistToBplist } from "../../src/service/playlist/playlist-to-bplist";

const playlist: Playlist = {
  playlistTitle: "Test Playlist",
  playlistAuthor: "Test Author",
  songs: [
    {
      songName: "Song A",
      levelAuthorName: "Mapper A",
      hash: "a1b2c3d4e5f6789012345678901234ab",
      difficulties: [{ difficulty: "ExpertPlus", characteristic: "Standard" }],
    },
    {
      songName: "Song B",
      levelAuthorName: "Mapper B",
      hash: "b2c3d4e5f6789012345678901234abcd",
      difficulties: [
        { difficulty: "Expert", characteristic: "Standard" },
        { difficulty: "Hard", characteristic: "NoArrows" },
      ],
    },
  ],
};

describe("playlistToBplist", () => {
  test("emits difficulties as { name, characteristic } for the game parser", () => {
    const bplist = JSON.parse(playlistToBplist(playlist)) as {
      songs: Array<{ difficulties: Array<{ name: string; characteristic: string }> }>;
    };

    expect(bplist.songs[0]?.difficulties).toEqual([{ name: "ExpertPlus", characteristic: "Standard" }]);
  });

  test("converts every difficulty entry", () => {
    const bplist = JSON.parse(playlistToBplist(playlist)) as {
      songs: Array<{ difficulties: Array<{ name: string; characteristic: string }> }>;
    };

    expect(bplist.songs[1]?.difficulties).toEqual([
      { name: "Expert", characteristic: "Standard" },
      { name: "Hard", characteristic: "NoArrows" },
    ]);
  });

  test("preserves playlist metadata and song identity", () => {
    const bplist = JSON.parse(playlistToBplist(playlist)) as {
      playlistTitle: string;
      playlistAuthor: string;
      songs: Array<{ songName: string; levelAuthorName: string; hash: string }>;
    };

    expect(bplist.playlistTitle).toBe("Test Playlist");
    expect(bplist.playlistAuthor).toBe("Test Author");
    expect(bplist.songs[0]?.songName).toBe("Song A");
    expect(bplist.songs[0]?.levelAuthorName).toBe("Mapper A");
    expect(bplist.songs[0]?.hash).toBe("a1b2c3d4e5f6789012345678901234ab");
  });
});
