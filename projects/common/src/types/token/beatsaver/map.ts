import { prop } from "@typegoose/typegoose";
import type BeatSaverAccountToken from "./account";
import type BeatSaverMapMetadataToken from "./map-metadata";
import type BeatSaverMapStatsToken from "./map-stats";
import type BeatSaverMapVersionToken from "./map-version";

export default class BeatSaverMapToken {
  /**
   * The BSR code of the map.
   */
  @prop({ localField: "id", foreignField: "_id", ref: "BeatSaverMap" })
  public id!: string;

  /**
   * The name of the map.
   */
  @prop()
  public name!: string;

  /**
   * The description of the map.
   */
  @prop()
  public description!: string;

  /**
   * The uploader of the map.
   */
  @prop()
  public uploader!: BeatSaverAccountToken;

  /**
   * The metadata of the map.
   */
  @prop()
  public metadata!: BeatSaverMapMetadataToken;

  /**
   * The stats of the map.
   */
  @prop()
  public stats!: BeatSaverMapStatsToken;

  /**
   * The date the map was uploaded.
   */
  @prop()
  public uploaded!: string;

  /**
   * Whether the map was mapped by an automapper.
   */
  @prop()
  public automapper!: boolean;

  /**
   * Whether the map is ranked on ScoreSaber.
   */
  @prop()
  public ranked!: boolean;

  /**
   * Whether the map is qualified on ScoreSaber.
   */
  @prop()
  public qualified!: boolean;

  /**
   * The versions of the map.
   */
  @prop()
  public versions!: BeatSaverMapVersionToken[];

  /**
   * The date the map was created.
   */
  @prop()
  public createdAt!: string;

  /**
   * The date the map was last updated.
   */
  @prop()
  public updatedAt!: string;

  /**
   * The date the map was last published.
   */
  @prop()
  public lastPublishedAt!: string;

  /**
   * The tags of the map.
   */
  @prop()
  public tags!: string[];

  /**
   * Whether the map is declared to be mapped by an AI.
   */
  @prop()
  public declaredAi!: string;

  /**
   * Whether the map is ranked on BeatLeader.
   */
  @prop()
  public blRanked!: boolean;

  /**
   * Whether the map is qualified on BeatLeader.
   */
  @prop()
  public blQualified!: boolean;
}
