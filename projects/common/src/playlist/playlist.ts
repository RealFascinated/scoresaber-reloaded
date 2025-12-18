import {
  getModelForClass,
  modelOptions,
  prop,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
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
    songs: ScoreSaberLeaderboard[],
    category?: PlaylistCategory
  ) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.image = image;
    this.songs = songs.map(song => ({
      songName: song.songName,
      songAuthor: song.songAuthorName,
      songHash: song.songHash,
      difficulties: song.difficulties.map(difficulty => ({
        difficulty: difficulty.difficulty,
        characteristic: difficulty.characteristic,
      })),
    }));
    this.category = category;
  }
}

export type PlaylistDocument = Playlist & Document;
export const PlaylistModel: ReturnModelType<typeof Playlist> = getModelForClass(Playlist);
