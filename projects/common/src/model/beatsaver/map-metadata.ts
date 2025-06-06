import { modelOptions, prop, Severity } from "@typegoose/typegoose";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
})
export default class BeatSaverMapMetadata {
  /**
   * The bpm of the song.
   */
  @prop({ required: true })
  bpm: number;

  /**
   * The song's length in seconds.
   */
  @prop({ required: true })
  duration: number;

  /**
   * The song's name.
   */
  @prop({ required: true })
  songName: string;

  /**
   * The song's sub name.
   */
  @prop({ required: false })
  songSubName: string;

  /**
   * The artist(s) name.
   */
  @prop({ required: false })
  songAuthorName: string | undefined;

  /**
   * The level mapper(s) name.
   */
  @prop({ required: true })
  levelAuthorName: string;

  constructor(
    bpm: number,
    duration: number,
    songName: string,
    songSubName: string,
    songAuthorName: string,
    levelAuthorName: string
  ) {
    this.bpm = bpm;
    this.duration = duration;
    this.songName = songName;
    this.songSubName = songSubName;
    this.songAuthorName = songAuthorName;
    this.levelAuthorName = levelAuthorName;
  }
}
