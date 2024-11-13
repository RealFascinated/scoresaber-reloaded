import { BeatSaberPlaylistDifficulty } from "./beatsaber-playlist-difficulty";

export type BeatSaberPlaylistSong = {
  songName: string;
  levelAuthorName: string;
  hash: string;
  levelid: string;
  difficulties: BeatSaberPlaylistDifficulty[];
};
