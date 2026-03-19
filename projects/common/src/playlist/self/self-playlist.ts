import { env } from "../../env";
import { ScoreSaberLeaderboard } from "../../model/leaderboard/impl/scoresaber-leaderboard";
import { Playlist } from "../playlist";
import type { SelfPlaylistSettings } from "./self-playlist-settings-schema";

export class SelfPlaylist extends Playlist {
  /**
   * The settings for the self playlist
   */
  public readonly settings: SelfPlaylistSettings;

  /**
   * The user id this playlist was generated for
   */
  public readonly userId: string;

  constructor(
    userId: string,
    settings: SelfPlaylistSettings,
    title: string,
    songs: ScoreSaberLeaderboard[],
    image: string
  ) {
    super(`scoresaber-self-${userId}`, title, env.NEXT_PUBLIC_WEBSITE_NAME, image, songs);

    this.settings = settings;
    this.userId = userId;
  }
}
