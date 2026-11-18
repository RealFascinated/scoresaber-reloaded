import { describe, expect, test } from "bun:test";
import {
  TEST_PLAYER_ID,
  TEST_PLAYER_TWO_ID,
  TEST_SONG_HASH,
  UNKNOWN_PLAYER_ID,
} from "../../../test/helpers/constants";
import PlaylistService from "./playlist.service";

function encodeSettings(settings: object) {
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}

describe("PlaylistService", () => {
  describe("createCustomRankedPlaylist", () => {
    test("groups the ranked leaderboards by song", async () => {
      const playlist = await PlaylistService.createCustomRankedPlaylist(
        encodeSettings({ stars: { min: 0, max: 13 }, sort: "stars" })
      );
      expect(playlist.songs.map(song => song.hash)).toContain(TEST_SONG_HASH.toUpperCase());
      expect(playlist.songs.find(song => song.hash === TEST_SONG_HASH.toUpperCase())?.difficulties).toEqual([
        { difficulty: "ExpertPlus", characteristic: "Standard" },
      ]);
    });

    test("filters by the star range", async () => {
      const playlist = await PlaylistService.createCustomRankedPlaylist(
        encodeSettings({ stars: { min: 9, max: 13 }, sort: "stars" })
      );
      expect(playlist.songs).toEqual([]);
    });
  });

  describe("getSelfPlaylist", () => {
    test("lists the songs a player has scores on", async () => {
      const playlist = await PlaylistService.getSelfPlaylist(TEST_PLAYER_ID);
      expect(playlist.songs.map(song => song.hash)).toContain(TEST_SONG_HASH.toUpperCase());
    });

    test("throws when the player is not tracked", async () => {
      await expect(PlaylistService.getSelfPlaylist(UNKNOWN_PLAYER_ID)).rejects.toThrow("isn't tracked");
    });

    test("throws when no scores match the status filter", async () => {
      await expect(
        PlaylistService.getSelfPlaylist(TEST_PLAYER_ID, encodeSettings({ rankedStatus: "unranked" }))
      ).rejects.toThrow("has no scores");
    });

    test("throws when the accuracy range excludes every score", async () => {
      await expect(
        PlaylistService.getSelfPlaylist(
          TEST_PLAYER_ID,
          encodeSettings({ accuracyRange: { min: 99, max: 100 } })
        )
      ).rejects.toThrow("no scores match the filters");
    });
  });

  describe("getSnipePlaylist", () => {
    test("includes songs where the sniped player has the better score", async () => {
      const playlist = await PlaylistService.getSnipePlaylist(TEST_PLAYER_TWO_ID, TEST_PLAYER_ID);
      expect(playlist.songs.map(song => song.hash)).toContain(TEST_SONG_HASH.toUpperCase());
    });

    test("excludes songs where the sniping player is already ahead", async () => {
      const playlist = await PlaylistService.getSnipePlaylist(TEST_PLAYER_ID, TEST_PLAYER_TWO_ID);
      expect(playlist.songs).toEqual([]);
    });

    test("throws when sniping yourself", async () => {
      await expect(PlaylistService.getSnipePlaylist(TEST_PLAYER_ID, TEST_PLAYER_ID)).rejects.toThrow(
        "cannot snipe yourself"
      );
    });

    test("throws when a player is not tracked", async () => {
      await expect(PlaylistService.getSnipePlaylist(TEST_PLAYER_ID, UNKNOWN_PLAYER_ID)).rejects.toThrow(
        "isn't tracked"
      );
    });
  });
});
