import type { PlaylistCategory } from "@ssr/common/playlist/playlist-category";
import { PlaylistSong } from "@ssr/common/playlist/playlist-song";
import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "playlists" },
})
export class PlaylistDocument {
  @prop()
  public id!: string;

  @prop()
  public title!: string;

  @prop()
  public author!: string;

  @prop()
  public image!: string;

  @prop()
  public songs!: PlaylistSong[];

  @prop()
  public category?: PlaylistCategory;
}

export const PlaylistModel: ReturnModelType<typeof PlaylistDocument> = getModelForClass(PlaylistDocument);
