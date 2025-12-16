import {
  getModelForClass,
  modelOptions,
  prop,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
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
  public category?: "ranked-batch";

  constructor(
    id: string,
    title: string,
    author: string,
    image: string,
    songs: PlaylistSong[],
    category?: "ranked-batch"
  ) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.image = image;
    this.songs = songs;
    this.category = category;
  }
}

export type PlaylistDocument = Playlist & Document;
export const PlaylistModel: ReturnModelType<typeof Playlist> = getModelForClass(Playlist);
