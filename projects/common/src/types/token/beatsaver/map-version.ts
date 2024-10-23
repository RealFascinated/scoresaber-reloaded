import { BeatSaverMapDifficultyToken } from "./map-difficulty";

export type BeatSaverMapVersionToken = {
  /**
   * The hash of the map.
   */
  hash: string;

  /**
   * The stage of the map.
   */
  stage: "Published"; // todo: find the rest of these

  /**
   * The date the map was created.
   */
  createdAt: string;

  /**
   * The sage score of the map. (no idea what this is x.x)
   */
  sageScore: number;

  /**
   * The difficulties in the map.
   */
  diffs: BeatSaverMapDifficultyToken[];

  /**
   * The URL to the download of the map.
   */
  downloadURL: string;

  /**
   * The URL to the cover image.
   */
  coverURL: string;

  /**
   * The URL to the preview of the map.
   */
  previewURL: string;
};
