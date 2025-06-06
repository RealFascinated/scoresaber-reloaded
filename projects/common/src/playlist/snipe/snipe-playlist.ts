import { env } from "../../env";
import type { SnipeSettings } from "../../snipe/snipe-settings-schema";
import { Playlist } from "../playlist";
import type { PlaylistSong } from "../playlist-song";

export type SnipeType = "top" | "recent";
export class SnipePlaylist extends Playlist {
  /**
   * The type of snipe (top scores or recent scores)
   */
  public readonly type: SnipeType;

  /**
   * The settings for the snipe playlist
   */
  public readonly settings: SnipeSettings;

  /**
   * The user who is being sniped
   */
  public readonly toSnipeId: string;

  /**
   * The user who is sniping
   */
  public readonly userId: string;

  constructor(
    toSnipeId: string,
    userId: string,
    type: SnipeType,
    settings: SnipeSettings,
    title: string,
    songs: PlaylistSong[],
    image: string
  ) {
    super(`scoresaber-snipe-${toSnipeId}`, title, env.NEXT_PUBLIC_WEBSITE_NAME, image, songs);

    this.type = type;
    this.settings = settings;
    this.toSnipeId = toSnipeId;
    this.userId = userId;
  }
}
