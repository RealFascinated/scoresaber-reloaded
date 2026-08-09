import { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";

/**
 * Serializes an SSR playlist into the Beat Saber BPLIST format.
 *
 * The game's playlist parser (`BeatSaberPlaylistsLib`) deserializes each
 * `songs[].difficulties` entry as `{ name, characteristic }` — the SSR schema
 * uses `{ difficulty, characteristic }`. Emitting the wrong key leaves the
 * difficulty name unset, so the game can't match the diff and either shows no
 * highlight or falls back to the lowest one. This converter renames the field
 * so in-game highlighting works.
 */
export function playlistToBplist(playlist: Playlist): string {
  return JSON.stringify({
    playlistTitle: playlist.playlistTitle,
    playlistAuthor: playlist.playlistAuthor,
    ...(playlist.customData ? { customData: playlist.customData } : {}),
    ...(playlist.image ? { image: playlist.image } : {}),
    songs: playlist.songs.map(song => ({
      songName: song.songName,
      levelAuthorName: song.levelAuthorName,
      hash: song.hash,
      difficulties: song.difficulties.map(difficulty => ({
        name: difficulty.difficulty,
        characteristic: difficulty.characteristic,
      })),
    })),
  });
}
