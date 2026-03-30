import { prop } from "@typegoose/typegoose";
import type BeatSaverMapDifficultyToken from "./map-difficulty";

export default class BeatSaverMapVersionToken {
  /**
   * The hash of the map.
   * Indexed for faster lookups by hash.
   */
  @prop({ index: true })
  public hash!: string;

  /**
   * Legacy field; BeatSaver Swagger uses `state`.
   */
  @prop()
  public stage?: string;

  /**
   * BeatSaver API `MapVersion.state` (Swagger).
   */
  @prop()
  public state?: "Uploaded" | "Testplay" | "Published" | "Feedback" | "Scheduled";

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

  @prop()
  public feedback?: string;

  @prop()
  public key?: string;

  @prop()
  public scheduledAt?: string;

  @prop()
  public testplayAt?: string;

  /** `MapTestplay[]` in Swagger; left loose to avoid extra token types. */
  @prop({ type: () => [Object] })
  public testplays?: Record<string, unknown>[];

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
