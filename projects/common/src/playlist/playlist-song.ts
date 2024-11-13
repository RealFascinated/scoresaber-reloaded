import { PlaylistSongDifficulty } from "./playlist-song-difficulty";

export type PlaylistSong = {
  /**
   * The name of the song.
   */
  songName: string;

  /**
   * The author of the song.
   */
  songAuthor: string;

  /**
   * The hash of the song
   */
  songHash: string;

  /**
   * The difficulties to highlight
   */
  difficulties: PlaylistSongDifficulty[];
};
