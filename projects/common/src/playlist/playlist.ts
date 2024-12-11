import {PlaylistSong} from "./playlist-song";
import {BeatSaberPlaylist} from "./beatsaber/beatsaber-playlist";
import {Config} from "../config";

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
   * The image of the playlist.
   */
  image: string;

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
    const deduplicatedSongs = new Map<string, PlaylistSong>();
    for (const song of this.songs) {
      let existingSong = deduplicatedSongs.get(song.songHash);

      if (existingSong) {
        // Merge difficulties, avoiding duplicates
        const newDifficulties = song.difficulties.filter(
          newDiff => !existingSong.difficulties.some(
            existingDiff =>
              existingDiff.characteristic === newDiff.characteristic &&
              existingDiff.difficulty === newDiff.difficulty
          )
        );
        existingSong.difficulties.push(...newDifficulties);
      } else {
        // Create a new song entry with a copy of difficulties
        deduplicatedSongs.set(song.songHash, {
          ...song,
          difficulties: [...song.difficulties]
        });
      }
    }

    return {
      playlistTitle: this.title,
      playlistAuthor: this.author,
      customData: {
        syncURL: `${Config.apiUrl}/playlist/${this.id}`,
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
      image: "base64," + this.image,
    };
  }

  constructor(id: string, title: string, author: string, image: string, songs: PlaylistSong[]) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.image = image;
    this.songs = songs;
  }
}
