import { env } from "../env";
import { encodeSnipePlaylistSettings } from "../snipe/snipe-playlist-utils";
import { BeatSaberPlaylist } from "./beatsaber/beatsaber-playlist";
import { Playlist } from "./playlist";
import { SelfPlaylist } from "./self/self-playlist";
import { encodeSelfPlaylistSettings } from "./self/self-playlist-utils";
import { SnipePlaylist } from "./snipe/snipe-playlist";

/**
 * Gets the URL of a playlist
 *
 * @param playlist the playlist
 * @returns the URL of the playlist
 */
export function getPlaylistURL(playlist: Playlist): string {
  const base = `${env.NEXT_PUBLIC_API_URL}/playlist/`;

  if (playlist instanceof SnipePlaylist) {
    return (
      base +
      `snipe?user=${playlist.userId}&toSnipe=${playlist.toSnipeId}&settings=${encodeSnipePlaylistSettings(playlist.settings)}`
    );
  }

  if (playlist instanceof SelfPlaylist) {
    return base + `self?user=${playlist.userId}&settings=${encodeSelfPlaylistSettings(playlist.settings)}`;
  }

  return base + playlist.id + ".bplist";
}

/**
 * Converts the playlist to a BeatSaber playlist
 *
 * @param playlist the playlist to convert
 * @returns the converted BeatSaber playlist
 */
export async function playlistToBeatSaberPlaylist(playlist: Playlist): Promise<BeatSaberPlaylist> {
  return {
    playlistTitle: playlist.title,
    playlistAuthor: playlist.author,
    customData: {
      syncURL: getPlaylistURL(playlist),
    },
    songs: playlist.songs.map(song => ({
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
