import { env } from "../env";
import { encodeSnipePlaylistSettings } from "../snipe/snipe-playlist-utils";
import { BeatSaberPlaylist } from "./beatsaber/beatsaber-playlist";
import { Playlist } from "./playlist";
import { PlaylistSong } from "./playlist-song";
import { SnipePlaylist } from "./snipe/snipe-playlist";

/**
 * Gets the URL of a playlist
 *
 * @param playlist the playlist
 * @returns the URL of the playlist
 */
export function getPlaylistURL(playlist: Playlist): string {
  return `${env.NEXT_PUBLIC_API_URL}/playlist/${
    playlist instanceof SnipePlaylist
      ? `snipe?user=${playlist.userId}&toSnipe=${playlist.toSnipeId}&settings=${encodeSnipePlaylistSettings(playlist.settings)}`
      : playlist.id + ".bplist"
  }`;
}

/**
 * Converts the playlist to a BeatSaber playlist
 *
 * @returns a BeatSaber playlist
 */
export async function generateBeatSaberPlaylist(playlist: Playlist): Promise<BeatSaberPlaylist> {
  const deduplicatedSongs = new Map<string, PlaylistSong>();
  for (const song of playlist.songs) {
    let existingSong = deduplicatedSongs.get(song.songHash);

    if (existingSong) {
      // Merge difficulties, avoiding duplicates
      const newDifficulties = song.difficulties.filter(
        newDiff =>
          !existingSong.difficulties.some(
            existingDiff =>
              existingDiff.characteristic === newDiff.characteristic && existingDiff.difficulty === newDiff.difficulty
          )
      );
      existingSong.difficulties.push(...newDifficulties);
    } else {
      // Create a new song entry with a copy of difficulties
      deduplicatedSongs.set(song.songHash, {
        ...song,
        difficulties: [...song.difficulties],
      });
    }
  }

  return {
    playlistTitle: playlist.title,
    playlistAuthor: playlist.author,
    customData: {
      syncURL: getPlaylistURL(playlist),
    },
    songs: Array.from(deduplicatedSongs.values()).map(song => ({
      songName: song.songName,
      levelAuthorName: song.songAuthor,
      hash: song.songHash,
      difficulties: song.difficulties.map(difficulty => ({
        characteristic: difficulty.characteristic,
        name: difficulty.difficulty,
      })),
    })),
    image: "base64," + playlist.image,
  };
}
