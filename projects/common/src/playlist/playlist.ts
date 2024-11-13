import { PlaylistSong } from "./playlist-song";
import { BeatSaberPlaylist } from "./beatsaber/beatsaber-playlist";
import { Config } from "../config";

export class Playlist {
  /**
   * The id of the playlist
   */
  id: string;

  /**
   * The title of the playlist
   */
  title: string;

  /**
   * The author of the playlist.
   */
  author: string;

  /**
   * The songs in the playlist.
   */
  songs: PlaylistSong[];

  /**
   * Converts the playlist to a BeatSaber playlist
   *
   * @returns a BeatSaber playlist
   */
  public async generateBeatSaberPlaylist(): Promise<BeatSaberPlaylist> {
    return {
      playlistTitle: this.title,
      playlistAuthor: this.author,
      customData: {
        syncURL: `${Config.apiUrl}/playlist/${this.id}`,
      },
      songs: this.songs.map(song => {
        return {
          songName: song.songName,
          levelAuthorName: song.songAuthor,
          hash: song.songHash,
          levelid: `custom_level_${song.songHash}`,
          difficulties: song.difficulties.map(difficulty => {
            return {
              characteristic: difficulty.characteristic,
              name: difficulty.difficulty,
            };
          }),
        };
      }),
    };
  }

  constructor(id: string, title: string, author: string, songs: PlaylistSong[]) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.songs = songs;
  }
}
