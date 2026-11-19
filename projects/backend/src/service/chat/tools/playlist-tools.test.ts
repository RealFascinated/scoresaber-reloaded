import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { describe, expect, it } from "bun:test";
import {
  MAX_CREATE_PLAYLIST_SONGS,
  MAX_GENERATED_PLAYLIST_SONGS,
  buildPlaylistOutput,
  capPlaylistDescription,
  capPlaylistTitle,
  chunkItems,
  dedupeResolvedMaps,
  encodePlaylistSettings,
  playlistModelOutput,
  slugifyPlaylistTitle,
  uniquePlaylistMaps,
} from "./playlist-tool-utils";

function makePlaylist(songCount: number, image?: string) {
  return {
    playlistTitle: "My Maps",
    playlistAuthor: "ScoreSaber Reloaded",
    customData: { syncURL: "https://example.com/playlist.bplist" },
    image,
    songs: Array.from({ length: songCount }, (_, index) => ({
      songName: `Song ${index}`,
      levelAuthorName: "Mapper",
      hash: `ABC${index}`,
      difficulties: [{ difficulty: "ExpertPlus" as const, characteristic: "Standard" as const }],
    })),
  } satisfies Playlist;
}

describe("slugifyPlaylistTitle", () => {
  it("builds a safe file stem", () => {
    expect(slugifyPlaylistTitle("My Favourite Maps!")).toBe("my-favourite-maps");
    expect(slugifyPlaylistTitle("  Café / Bar  ")).toBe("cafe-bar");
  });

  it("falls back when there is nothing usable", () => {
    expect(slugifyPlaylistTitle("***")).toBe("playlist");
  });
});

describe("playlist text caps", () => {
  it("trims titles and descriptions", () => {
    expect(capPlaylistTitle("  A title  ")).toBe("A title");
    expect(capPlaylistTitle("x".repeat(200))).toHaveLength(100);
    expect(capPlaylistDescription("  ")).toBeUndefined();
    expect(capPlaylistDescription("d".repeat(1000))).toHaveLength(500);
  });
});

describe("uniquePlaylistMaps", () => {
  it("drops duplicate leaderboard ids and keeps first-seen order", () => {
    const maps = [{ leaderboardId: 2 }, { leaderboardId: 1 }, { leaderboardId: 2 }];
    expect(uniquePlaylistMaps(maps, 10)).toEqual([{ leaderboardId: 2 }, { leaderboardId: 1 }]);
  });

  it("dedupes hash entries case-insensitively with the default characteristic", () => {
    const maps = [
      { songHash: "ABC", difficulty: "Expert" as const },
      { songHash: "abc", difficulty: "Expert" as const, characteristic: "Standard" as const },
      { songHash: "abc", difficulty: "Expert" as const, characteristic: "OneSaber" as const },
    ];
    expect(uniquePlaylistMaps(maps, 10)).toHaveLength(2);
  });

  it("caps the list", () => {
    const maps = Array.from({ length: 150 }, (_, index) => ({ leaderboardId: index + 1 }));
    expect(uniquePlaylistMaps(maps, MAX_CREATE_PLAYLIST_SONGS)).toHaveLength(MAX_CREATE_PLAYLIST_SONGS);
  });
});

describe("dedupeResolvedMaps", () => {
  it("drops the same song difficulty resolved twice", () => {
    const maps = [
      {
        songHash: "ABC",
        songName: "Song",
        levelAuthorName: "Mapper",
        difficulty: "ExpertPlus" as const,
        characteristic: "Standard" as const,
      },
      {
        songHash: "abc",
        songName: "Song",
        levelAuthorName: "Mapper",
        difficulty: "ExpertPlus" as const,
        characteristic: "Standard" as const,
      },
      {
        songHash: "abc",
        songName: "Song",
        levelAuthorName: "Mapper",
        difficulty: "Expert" as const,
        characteristic: "Standard" as const,
      },
    ];

    expect(dedupeResolvedMaps(maps)).toHaveLength(2);
  });
});

describe("buildPlaylistOutput", () => {
  it("builds the bplist, file name and song count", () => {
    const output = buildPlaylistOutput(makePlaylist(2), { maxSongs: 10 });

    expect(output.title).toBe("My Maps");
    expect(output.songCount).toBe(2);
    expect(output.fileName).toBe("my-maps.bplist");
    expect(output.bplist.songs[0].difficulties).toEqual([{ name: "ExpertPlus", characteristic: "Standard" }]);
  });

  it("caps songs per file", () => {
    const output = buildPlaylistOutput(makePlaylist(MAX_GENERATED_PLAYLIST_SONGS + 20));
    expect(output.songCount).toBe(MAX_GENERATED_PLAYLIST_SONGS);
    expect(output.bplist.songs).toHaveLength(MAX_GENERATED_PLAYLIST_SONGS);
  });

  it("strips a huge cover image and the sync route", () => {
    const output = buildPlaylistOutput(makePlaylist(1, "data:image/png;base64," + "A".repeat(5000)));

    expect(output.bplist.image).toBeUndefined();
    expect("customData" in output.bplist).toBe(false);
  });

  it("adds the description and dropped entries to the bplist or summary", () => {
    const output = buildPlaylistOutput(makePlaylist(1), {
      description: "Hard tech maps",
      skipped: [{ input: "leaderboard 9", reason: "Map not found" }],
    });

    expect(output.bplist.playlistDescription).toBe("Hard tech maps");
    expect(output.skipped).toEqual([{ input: "leaderboard 9", reason: "Map not found" }]);
  });
});

describe("playlistModelOutput", () => {
  it("never sends the bplist to the model", () => {
    const output = buildPlaylistOutput(makePlaylist(3));
    const modelOutput = playlistModelOutput(output);

    expect(modelOutput.type).toBe("json");
    expect(modelOutput.value).toEqual({
      title: "My Maps",
      songCount: 3,
      fileName: "my-maps.bplist",
    });
    expect("bplist" in modelOutput.value).toBe(false);
  });

  it("keeps skipped entries for the model", () => {
    const output = buildPlaylistOutput(makePlaylist(1), {
      skipped: [{ input: "leaderboard 9", reason: "Map not found" }],
    });
    expect(playlistModelOutput(output).value).toEqual({
      title: "My Maps",
      songCount: 1,
      fileName: "my-maps.bplist",
      skipped: [{ input: "leaderboard 9", reason: "Map not found" }],
    });
  });

  it("passes errors and skipped entries through", () => {
    expect(
      playlistModelOutput({ error: "No maps resolved", skipped: [{ input: "x", reason: "missing" }] }).value
    ).toEqual({ error: "No maps resolved", skipped: [{ input: "x", reason: "missing" }] });
  });
});

describe("encodePlaylistSettings", () => {
  it("returns undefined without settings", () => {
    expect(encodePlaylistSettings(undefined)).toBeUndefined();
  });

  it("encodes partial settings as base64 JSON", () => {
    const encoded = encodePlaylistSettings({ sort: "pp", starRange: { min: 5, max: 8 } });
    expect(encoded).toBeDefined();
    expect(JSON.parse(Buffer.from(encoded ?? "", "base64").toString())).toEqual({
      sort: "pp",
      starRange: { min: 5, max: 8 },
    });
  });
});

describe("chunkItems", () => {
  it("splits items into bounded chunks", () => {
    expect(chunkItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkItems([], 10)).toEqual([]);
  });

  it("rejects an invalid chunk size", () => {
    expect(() => chunkItems([1], 0)).toThrow();
  });
});
