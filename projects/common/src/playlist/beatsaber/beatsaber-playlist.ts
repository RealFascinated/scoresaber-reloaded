import { BeatSaberPlaylistSong } from "./beatsaber-playlist-song";
import { BeatSaberPlaylistCustomData } from "./beatsaver-playlist-custom-data";

export type BeatSaberPlaylist = {
  playlistTitle: string;
  playlistAuthor: string;
  customData: BeatSaberPlaylistCustomData;
  songs: BeatSaberPlaylistSong[];
  image: string;
};
