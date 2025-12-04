import { prop } from "@typegoose/typegoose";
import type BeatSaverMapDifficultyToken from "./map-difficulty";

export default class BeatSaverMapVersionToken {
  /**
   * The hash of the map.
   */
  @prop()
  public hash!: string;

  /**
   * The stage of the map.
   */
  @prop()
  public stage!: "Published"; // todo: find the rest of these

  /**
   * The date the map was created.
   */
  @prop()
  public createdAt!: string;

  /**
   * The sage score of the map. (no idea what this is x.x)
   */
  @prop()
  public sageScore!: number;

  /**
   * The difficulties in the map.
   */
  @prop()
  public diffs!: BeatSaverMapDifficultyToken[];

  /**
   * The URL to the download of the map.
   */
  @prop()
  public downloadURL!: string;

  /**
   * The URL to the cover image.
   */
  @prop()
  public coverURL!: string;

  /**
   * The URL to the preview of the map.
   */
  @prop()
  public previewURL!: string;
}
