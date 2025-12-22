import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import type { PlaylistCategory } from "./playlist-category";
import { PlaylistSong } from "./playlist-song";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "playlists" },
})
export class Playlist {
  /**
   * The id of the playlist
   */
  @prop()
  public id: string;

  /**
   * The title of the playlist
   */
  @prop()
  public title: string;

  /**
   * The author of the playlist.
   */
  @prop()
  public author: string;

  /**
   * The image of the playlist.
   */
  @prop()
  public image: string;

  /**
   * The songs in the playlist.
   */
  @prop()
  public songs: PlaylistSong[];

  /**
   * The category of the playlist.
   */
  @prop()
  public category?: PlaylistCategory;

  constructor(
    id: string,
    title: string,
    author: string,
    image: string,
    leaderboards: ScoreSaberLeaderboard[],
    category?: PlaylistCategory
  ) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.image = image;

    const playlistSongs: Map<string, PlaylistSong> = new Map();
    for (const leaderboard of leaderboards) {
      const song = playlistSongs.get(leaderboard.songHash);
      if (!song) {
        playlistSongs.set(leaderboard.songHash, {
          songName: leaderboard.songName,
          songAuthor: leaderboard.songAuthorName,
          songHash: leaderboard.songHash,
          difficulties: [
            {
              difficulty: leaderboard.difficulty.difficulty,
              characteristic: leaderboard.difficulty.characteristic,
            },
          ],
        });
        continue;
      }
      song.difficulties.push({
        difficulty: leaderboard.difficulty.difficulty,
        characteristic: leaderboard.difficulty.characteristic,
      });
    }
    this.songs = Array.from(playlistSongs.values());

    this.category = category;
  }
}

export type PlaylistDocument = Playlist & Document;
export const PlaylistModel: ReturnModelType<typeof Playlist> = getModelForClass(Playlist);
