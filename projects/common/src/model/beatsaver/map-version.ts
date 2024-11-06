import { modelOptions, prop, Severity } from "@typegoose/typegoose";
import BeatSaverMapDifficulty from "./map-difficulty";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
})
export default class BeatSaverMapVersion {
  /**
   * The hash of this map.
   */
  @prop({ required: true, index: true })
  hash: string;

  /**
   * The date the map was created.
   */
  @prop({ required: true })
  createdAt: Date;

  /**
   * The difficulties of this map.
   */
  @prop({ required: true })
  difficulties: BeatSaverMapDifficulty[];

  constructor(hash: string, createdAt: Date, difficulties: BeatSaverMapDifficulty[]) {
    this.hash = hash;
    this.createdAt = createdAt;
    this.difficulties = difficulties;
  }
}
